#!/usr/bin/env python3
"""
Integración del Agent Logistics-Quotation con las APIs del sistema
"""
import json
import requests
import subprocess
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path
import time

class LogisticsIntegration:
    def __init__(self):
        self.project_root = Path("/home/rypcloud/Documentos/Logistic/POC/axel")
        self.state_file = self.project_root / ".claude" / "logistics_state.json"
        self.backend_url = "http://localhost:5000"
        self.frontend_url = "http://localhost:3000"
        self.ai_service_url = "http://localhost:8001"

        # Cargar estado persistente
        self.load_state()

    def load_state(self):
        """Cargar estado desde archivo JSON"""
        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                self.state = json.load(f)
        except FileNotFoundError:
            # Estado por defecto si no existe el archivo
            self.state = {
                "current_session": None,
                "sessions": {},
                "quotation_templates": {"default": {}}
            }

    def save_state(self):
        """Guardar estado a archivo JSON"""
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(self.state, f, indent=2, ensure_ascii=False)

    def create_new_session(self):
        """Crear nueva sesión de cotización"""
        session_id = f"quote_{int(time.time())}"
        self.state["current_session"] = session_id
        self.state["sessions"][session_id] = {
            "origin": None,
            "destination": None,
            "weight_kg": None,
            "cargo_type": None,
            "pickup_date": None,
            "company_data": {
                "name": None,
                "contact_person": None,
                "email": None,
                "phone": None
            },
            "status": "collecting_data",
            "step": 1,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        self.save_state()
        return session_id

    def update_session_data(self, field, value):
        """Actualizar datos de la sesión actual"""
        if not self.state["current_session"]:
            return False

        session = self.state["sessions"][self.state["current_session"]]

        if field in ["name", "contact_person", "email", "phone"]:
            session["company_data"][field] = value
        else:
            session[field] = value

        session["updated_at"] = datetime.now().isoformat()
        self.save_state()
        return True

    def advance_step(self):
        """Avanzar al siguiente paso"""
        if not self.state["current_session"]:
            return False

        session = self.state["sessions"][self.state["current_session"]]
        session["step"] += 1
        session["updated_at"] = datetime.now().isoformat()
        self.save_state()
        return session["step"]

    def validate_spanish_city(self, city):
        """Validar que sea una ciudad española válida"""
        spanish_cities = self.state.get("validation_rules", {}).get("spanish_cities", [])
        return city.lower() in [c.lower() for c in spanish_cities]

    def validate_european_destination(self, destination):
        """Validar destino europeo"""
        european_countries = self.state.get("validation_rules", {}).get("european_countries", {})
        destination_lower = destination.lower()

        for country, cities in european_countries.items():
            if any(destination_lower in city.lower() or city.lower() in destination_lower
                   for city in cities):
                return True, country
        return False, None

    def validate_weight(self, weight_kg):
        """Validar peso de mercancía"""
        limits = self.state.get("validation_rules", {}).get("weight_limits", {})
        min_kg = limits.get("min_kg", 100)
        max_kg = limits.get("max_kg", 24000)

        return min_kg <= weight_kg <= max_kg

    def get_cargo_type_info(self, cargo_type):
        """Obtener información del tipo de carga"""
        cargo_types = self.state.get("validation_rules", {}).get("cargo_types", {})
        return cargo_types.get(cargo_type, {})

    def validate_pickup_date(self, date_str):
        """Validar fecha de recogida"""
        try:
            pickup_date = datetime.strptime(date_str, "%Y-%m-%d")
            today = datetime.now()

            if pickup_date <= today:
                return False, "La fecha debe ser futura"

            if pickup_date > today + timedelta(days=90):
                return False, "La fecha no puede ser más de 90 días en el futuro"

            # Verificar si es domingo (restricciones)
            if pickup_date.weekday() == 6:
                return True, "⚠️ ALERTA: Los domingos hay restricciones de circulación en algunos países europeos"

            return True, "Fecha válida"
        except ValueError:
            return False, "Formato de fecha inválido. Use YYYY-MM-DD"

    async def call_backend_api(self, endpoint, data=None, method="GET"):
        """Llamar APIs del backend"""
        try:
            url = f"{self.backend_url}{endpoint}"

            if method == "GET":
                response = requests.get(url, timeout=15)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=15)

            if response.status_code == 200:
                return True, response.json()
            else:
                return False, f"Error {response.status_code}: {response.text}"

        except requests.exceptions.RequestException as e:
            return False, f"Error de conexión: {str(e)}"

    async def generate_route_calculation(self, origin, destination):
        """Generar cálculo de ruta"""
        data = {
            "origin": origin,
            "destination": destination,
            "vehicle_type": "truck"
        }
        return await self.call_backend_api("/api/routes", data, "POST")

    async def calculate_tolls(self, route_data):
        """Calcular peajes de la ruta"""
        if not route_data.get("polyline"):
            return False, "No hay datos de ruta para calcular peajes"

        data = {
            "polyline": route_data["polyline"],
            "vehicle": {"type": "truck", "weight": 20}
        }
        return await self.call_backend_api("/api/tolls", data, "POST")

    async def check_restrictions(self, countries, pickup_date):
        """Verificar restricciones de tráfico"""
        data = {
            "countries": countries,
            "date": pickup_date,
            "vehicle_type": "truck"
        }
        return await self.call_backend_api("/api/restrictions", data, "POST")

    def generate_final_quotation(self):
        """Generar cotización final usando el servicio de logística europea"""
        if not self.state["current_session"]:
            return None, "No hay sesión activa"

        session_data = self.state["sessions"][self.state["current_session"]]

        # Verificar que todos los datos estén completos
        required_fields = ["origin", "destination", "weight_kg", "cargo_type", "pickup_date"]
        missing_fields = [field for field in required_fields if not session_data.get(field)]

        if missing_fields:
            return None, f"Faltan datos: {', '.join(missing_fields)}"

        # Llamar al servicio de logística europea
        try:
            quote_data = {
                "origin": session_data["origin"],
                "destination": session_data["destination"],
                "weight_kg": session_data["weight_kg"],
                "cargo_type": session_data["cargo_type"],
                "pickup_date": session_data["pickup_date"],
                "company_data": session_data["company_data"]
            }

            # Aquí integraríamos con european_logistics.py
            # Por ahora, simulamos la respuesta
            quotation = self._simulate_quotation(quote_data)

            # Guardar cotización en la sesión
            session_data["quotation"] = quotation
            session_data["status"] = "completed"
            session_data["step"] = 7
            self.save_state()

            return quotation, "Cotización generada exitosamente"

        except Exception as e:
            return None, f"Error generando cotización: {str(e)}"

    def _simulate_quotation(self, quote_data):
        """Simular generación de cotización (reemplazar con european_logistics.py)"""
        base_cost = quote_data["weight_kg"] * 1.5  # EUR por kg
        cargo_info = self.get_cargo_type_info(quote_data["cargo_type"])
        multiplier = cargo_info.get("rate_multiplier", 1.0)

        transport_cost = base_cost * multiplier
        fuel_cost = 450  # Estimado
        tolls_cost = 320  # Estimado
        insurance_cost = max(quote_data["weight_kg"] * 0.05, 50)

        total_cost = transport_cost + fuel_cost + tolls_cost + insurance_cost

        return {
            "quote_id": f"SL-{datetime.now().strftime('%Y%m%d')}-{int(time.time())%10000}",
            "origin": quote_data["origin"],
            "destination": quote_data["destination"],
            "weight_kg": quote_data["weight_kg"],
            "cargo_type": quote_data["cargo_type"],
            "pickup_date": quote_data["pickup_date"],
            "company_data": quote_data["company_data"],
            "cost_breakdown": {
                "transport": round(transport_cost, 2),
                "fuel": fuel_cost,
                "tolls": tolls_cost,
                "insurance": round(insurance_cost, 2),
                "total": round(total_cost, 2)
            },
            "estimated_days": 3,
            "distance_km": 1200,
            "restrictions": cargo_info.get("restrictions", []),
            "validity_days": 7,
            "created_at": datetime.now().isoformat()
        }

    def save_quotation_to_frontend(self, quotation):
        """Guardar cotización para el frontend"""
        quotations_dir = self.project_root / "frontend" / "public" / "quotations"
        quotations_dir.mkdir(parents=True, exist_ok=True)

        quotation_file = quotations_dir / f"{quotation['quote_id']}.json"
        with open(quotation_file, 'w', encoding='utf-8') as f:
            json.dump(quotation, f, indent=2, ensure_ascii=False)

        return quotation_file

    def open_frontend_with_quotation(self, quote_id):
        """Abrir frontend con la cotización específica"""
        try:
            # Verificar si el frontend está corriendo
            try:
                response = requests.get(self.frontend_url, timeout=5)
                frontend_running = response.status_code == 200
            except requests.exceptions.RequestException:
                frontend_running = False

            if not frontend_running:
                print("⚠️ El frontend no está corriendo. Iniciando...")
                self._start_frontend()
                time.sleep(5)  # Esperar a que se inicie

            # Abrir en el navegador
            url = f"{self.frontend_url}/quotation/{quote_id}"
            webbrowser.open(url)
            print(f"🌐 Abriendo cotización en el navegador: {url}")

            return True
        except Exception as e:
            print(f"❌ Error abriendo frontend: {str(e)}")
            return False

    def _start_frontend(self):
        """Iniciar el frontend"""
        try:
            frontend_dir = self.project_root / "frontend"
            subprocess.Popen(
                ["npm", "start"],
                cwd=frontend_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            print("🚀 Frontend iniciado en segundo plano")
        except Exception as e:
            print(f"❌ Error iniciando frontend: {str(e)}")

    def get_current_session_status(self):
        """Obtener estado de la sesión actual"""
        if not self.state["current_session"]:
            return None

        session_id = self.state["current_session"]
        session = self.state["sessions"][session_id]

        step_descriptions = self.state.get("step_descriptions", {})
        current_step_desc = step_descriptions.get(str(session["step"]), f"Paso {session['step']}")

        return {
            "session_id": session_id,
            "step": session["step"],
            "step_description": current_step_desc,
            "status": session["status"],
            "data_collected": {
                "origin": session.get("origin"),
                "destination": session.get("destination"),
                "weight_kg": session.get("weight_kg"),
                "cargo_type": session.get("cargo_type"),
                "pickup_date": session.get("pickup_date"),
                "company_name": session.get("company_data", {}).get("name")
            }
        }

# Funciones helper para el agent
def create_quotation_session():
    """Crear nueva sesión de cotización"""
    integration = LogisticsIntegration()
    session_id = integration.create_new_session()
    print(f"✅ Nueva sesión creada: {session_id}")
    return session_id

def update_quotation_data(field, value):
    """Actualizar datos de cotización"""
    integration = LogisticsIntegration()
    success = integration.update_session_data(field, value)
    if success:
        print(f"✅ {field} actualizado: {value}")
    return success

def validate_city_origin(city):
    """Validar ciudad de origen española"""
    integration = LogisticsIntegration()
    is_valid = integration.validate_spanish_city(city)
    return is_valid

def validate_destination(destination):
    """Validar destino europeo"""
    integration = LogisticsIntegration()
    is_valid, country = integration.validate_european_destination(destination)
    return is_valid, country

def generate_and_open_quotation():
    """Generar cotización final y abrir en frontend"""
    integration = LogisticsIntegration()

    quotation, message = integration.generate_final_quotation()
    if not quotation:
        print(f"❌ Error: {message}")
        return False

    # Guardar para frontend
    integration.save_quotation_to_frontend(quotation)

    # Abrir en navegador
    success = integration.open_frontend_with_quotation(quotation["quote_id"])

    if success:
        print(f"🎉 Cotización {quotation['quote_id']} generada y abierta exitosamente!")
        print(f"💰 Total: €{quotation['cost_breakdown']['total']}")

    return quotation

if __name__ == "__main__":
    # Test básico
    integration = LogisticsIntegration()
    print("🧪 Test de integración de logistics-quotation")

    # Crear sesión de prueba
    session_id = create_quotation_session()
    print(f"Sesión creada: {session_id}")

    # Test de validaciones
    print(f"Madrid válido: {validate_city_origin('Madrid')}")
    print(f"París válido: {validate_destination('París')}")