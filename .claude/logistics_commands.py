#!/usr/bin/env python3
"""
Comandos del Agent Logistics-Quotation para Claude Code
Sistema de comandos para gestión de cotizaciones
"""
import json
import subprocess
import webbrowser
import time
import requests
from pathlib import Path
from logistics_integration import LogisticsIntegration
from quotation_generator import QuotationGenerator

class LogisticsCommands:
    def __init__(self):
        self.project_root = Path("/home/rypcloud/Documentos/Logistic/POC/axel")
        self.integration = LogisticsIntegration()
        self.generator = QuotationGenerator()

    def start_new_quotation(self):
        """Comando: /quote start - Iniciar nueva cotización"""
        session_id = self.integration.create_new_session()
        print(f"🚀 Nueva cotización iniciada")
        print(f"📋 ID de sesión: {session_id}")
        print(f"👉 Siguiente paso: Proporciona la ciudad de origen en España")
        return {
            "session_id": session_id,
            "step": 1,
            "next_question": "¿Desde qué ciudad de España necesitas enviar la mercancía?"
        }

    def get_quotation_status(self):
        """Comando: /quote status - Ver estado actual"""
        status = self.integration.get_current_session_status()
        if not status:
            print("❌ No hay ninguna cotización activa")
            return None

        print(f"📊 Estado de cotización actual:")
        print(f"   🆔 Sesión: {status['session_id']}")
        print(f"   📍 Paso: {status['step']}/7 - {status['step_description']}")
        print(f"   📦 Estado: {status['status']}")

        # Mostrar datos recopilados
        data = status['data_collected']
        print(f"\n📋 Datos recopilados:")
        for key, value in data.items():
            if value:
                print(f"   ✅ {key}: {value}")
            else:
                print(f"   ⏳ {key}: pendiente")

        return status

    def resume_quotation(self, session_id=None):
        """Comando: /quote resume [id] - Continuar cotización"""
        if session_id:
            if session_id in self.integration.state["sessions"]:
                self.integration.state["current_session"] = session_id
                self.integration.save_state()
                print(f"✅ Cotización {session_id} restaurada")
            else:
                print(f"❌ Sesión {session_id} no encontrada")
                return None
        else:
            # Usar sesión actual
            if not self.integration.state["current_session"]:
                print("❌ No hay sesión activa para continuar")
                return None

        return self.get_quotation_status()

    def complete_quotation(self):
        """Comando: /quote complete - Finalizar y generar cotización"""
        if not self.integration.state["current_session"]:
            print("❌ No hay sesión activa")
            return None

        session_data = self.integration.state["sessions"][self.integration.state["current_session"]]

        # Verificar datos completos
        required_fields = ["origin", "destination", "weight_kg", "cargo_type", "pickup_date"]
        missing = [f for f in required_fields if not session_data.get(f)]

        if missing:
            print(f"❌ Faltan datos: {', '.join(missing)}")
            return None

        print("🔄 Generando cotización profesional...")

        # Generar cotización
        result = self.generator.generate_professional_quotation(session_data)

        if not result["success"]:
            print(f"❌ Error: {result['error']}")
            return None

        quotation = result["quotation"]
        documents = result["documents"]

        # Actualizar sesión
        session_data["quotation"] = quotation
        session_data["status"] = "completed"
        session_data["documents"] = documents
        self.integration.save_state()

        print(f"✅ Cotización generada exitosamente!")
        print(f"📄 ID: {documents['quote_id']}")
        print(f"💰 Total: €{quotation['costo_total_eur']}")
        print(f"📁 HTML: {documents['html']}")

        return {
            "quotation": quotation,
            "documents": documents,
            "session_id": self.integration.state["current_session"]
        }

    def open_frontend_quotation(self, quote_id=None):
        """Comando: /quote open [id] - Abrir cotización en frontend"""
        if not quote_id:
            # Usar última cotización de la sesión actual
            if not self.integration.state["current_session"]:
                print("❌ No hay sesión activa")
                return False

            session_data = self.integration.state["sessions"][self.integration.state["current_session"]]
            if "documents" not in session_data:
                print("❌ No hay cotización generada en esta sesión")
                return False

            quote_id = session_data["documents"]["quote_id"]

        print(f"🌐 Abriendo cotización {quote_id} en el frontend...")

        try:
            # 1. Verificar si el backend está corriendo
            backend_running = self._check_service("http://localhost:5000", "Backend")

            # 2. Verificar si el frontend está corriendo
            frontend_running = self._check_service("http://localhost:3000", "Frontend")

            # 3. Iniciar servicios si no están corriendo
            if not backend_running:
                self._start_backend()
                time.sleep(3)

            if not frontend_running:
                self._start_frontend()
                time.sleep(8)  # El frontend tarda más en iniciarse

            # 4. Copiar cotización a directorio público del frontend
            self._copy_quotation_to_frontend(quote_id)

            # 5. Abrir en navegador
            url = f"http://localhost:3000/quotation/{quote_id}"
            webbrowser.open(url)

            print(f"🎉 Cotización abierta en: {url}")
            print(f"💡 Si no se abre automáticamente, copia esta URL en tu navegador")

            return True

        except Exception as e:
            print(f"❌ Error abriendo frontend: {str(e)}")
            return False

    def _check_service(self, url, name):
        """Verificar si un servicio está corriendo"""
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                print(f"✅ {name} está corriendo")
                return True
        except requests.exceptions.RequestException:
            pass

        print(f"⚠️ {name} no está corriendo")
        return False

    def _start_backend(self):
        """Iniciar el backend"""
        print("🚀 Iniciando backend...")
        try:
            backend_dir = self.project_root / "backend"
            subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=backend_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            print("✅ Backend iniciado en segundo plano")
        except Exception as e:
            print(f"❌ Error iniciando backend: {str(e)}")

    def _start_frontend(self):
        """Iniciar el frontend"""
        print("🚀 Iniciando frontend...")
        try:
            frontend_dir = self.project_root / "frontend"
            subprocess.Popen(
                ["npm", "start"],
                cwd=frontend_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            print("✅ Frontend iniciado en segundo plano")
        except Exception as e:
            print(f"❌ Error iniciando frontend: {str(e)}")

    def _copy_quotation_to_frontend(self, quote_id):
        """Copiar cotización al directorio público del frontend"""
        try:
            # Archivo fuente
            source_file = self.project_root / "generated_documents" / f"{quote_id}.json"
            if not source_file.exists():
                raise FileNotFoundError(f"Cotización {quote_id} no encontrada")

            # Directorio destino
            public_dir = self.project_root / "frontend" / "public" / "quotations"
            public_dir.mkdir(parents=True, exist_ok=True)

            # Copiar archivo
            dest_file = public_dir / f"{quote_id}.json"
            with open(source_file, 'r', encoding='utf-8') as src:
                with open(dest_file, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())

            print(f"📋 Cotización copiada al frontend: {dest_file}")

        except Exception as e:
            print(f"⚠️ Error copiando cotización: {str(e)}")

    def list_quotations(self):
        """Comando: /quote list - Listar cotizaciones"""
        sessions = self.integration.state["sessions"]
        if not sessions:
            print("📋 No hay cotizaciones")
            return []

        print("📋 Cotizaciones disponibles:")
        quotations = []

        for session_id, session_data in sessions.items():
            status_icon = "✅" if session_data["status"] == "completed" else "⏳"
            origin = session_data.get("origin", "Pendiente")
            destination = session_data.get("destination", "Pendiente")
            created = session_data.get("created_at", "")[:10]  # Solo fecha

            print(f"   {status_icon} {session_id}: {origin} → {destination} ({created})")

            quotations.append({
                "session_id": session_id,
                "status": session_data["status"],
                "origin": origin,
                "destination": destination,
                "created_at": created
            })

        return quotations

    def delete_quotation(self, session_id):
        """Comando: /quote delete [id] - Eliminar cotización"""
        if session_id not in self.integration.state["sessions"]:
            print(f"❌ Sesión {session_id} no encontrada")
            return False

        del self.integration.state["sessions"][session_id]

        # Si era la sesión actual, limpiar
        if self.integration.state["current_session"] == session_id:
            self.integration.state["current_session"] = None

        self.integration.save_state()
        print(f"🗑️ Cotización {session_id} eliminada")
        return True

    def show_help(self):
        """Comando: /quote help - Mostrar ayuda"""
        help_text = """
🚚 COMANDOS DEL AGENT LOGISTICS-QUOTATION

📋 Gestión de Cotizaciones:
   /quote start          - Iniciar nueva cotización
   /quote status         - Ver estado de cotización actual
   /quote resume [id]    - Continuar cotización específica
   /quote complete       - Finalizar y generar cotización
   /quote list           - Listar todas las cotizaciones
   /quote delete [id]    - Eliminar cotización

🌐 Frontend:
   /quote open [id]      - Abrir cotización en navegador
   /quote open           - Abrir última cotización

🔧 Utilidades:
   /quote help           - Mostrar esta ayuda
   /quote services       - Verificar estado de servicios

💡 Ejemplo de uso:
   1. /quote start       (iniciar)
   2. Responder preguntas paso a paso
   3. /quote complete    (generar)
   4. /quote open        (abrir en navegador)
        """
        print(help_text)

    def check_services(self):
        """Comando: /quote services - Verificar servicios"""
        print("🔍 Verificando servicios del sistema...")

        services = [
            ("Backend", "http://localhost:5000"),
            ("Frontend", "http://localhost:3000"),
            ("AI Service", "http://localhost:8001")
        ]

        for name, url in services:
            self._check_service(url, name)

# Funciones helper para los comandos del agent
def execute_quote_command(command_line):
    """Ejecutar comando de cotización"""
    commands = LogisticsCommands()
    parts = command_line.strip().split()

    if len(parts) < 2 or parts[0] != "/quote":
        return "❌ Comando inválido. Use /quote help para ver comandos disponibles"

    cmd = parts[1].lower()

    try:
        if cmd == "start":
            return commands.start_new_quotation()
        elif cmd == "status":
            return commands.get_quotation_status()
        elif cmd == "resume":
            session_id = parts[2] if len(parts) > 2 else None
            return commands.resume_quotation(session_id)
        elif cmd == "complete":
            return commands.complete_quotation()
        elif cmd == "open":
            quote_id = parts[2] if len(parts) > 2 else None
            return commands.open_frontend_quotation(quote_id)
        elif cmd == "list":
            return commands.list_quotations()
        elif cmd == "delete":
            if len(parts) < 3:
                return "❌ Especifica el ID de la cotización a eliminar"
            return commands.delete_quotation(parts[2])
        elif cmd == "help":
            commands.show_help()
            return "Ayuda mostrada"
        elif cmd == "services":
            commands.check_services()
            return "Verificación de servicios completada"
        else:
            return f"❌ Comando desconocido: {cmd}. Use /quote help"

    except Exception as e:
        return f"❌ Error ejecutando comando: {str(e)}"

if __name__ == "__main__":
    # Test de comandos
    commands = LogisticsCommands()

    print("🧪 Test de comandos logistics-quotation")
    print("=" * 50)

    # Test de help
    commands.show_help()

    # Test de start
    result = commands.start_new_quotation()
    print(f"Resultado start: {result}")

    # Test de status
    status = commands.get_quotation_status()
    print(f"Status: {status}")

    # Test de services
    commands.check_services()