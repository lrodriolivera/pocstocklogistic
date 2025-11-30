#!/usr/bin/env python3
"""
Sistema de Generación de Cotizaciones Profesionales
Integrado con el Agent Logistics-Quotation de Claude Code
"""
import json
import sys
import os
from datetime import datetime
from pathlib import Path
from jinja2 import Template

# Agregar path del ai-service para importar european_logistics
sys.path.append(str(Path(__file__).parent.parent / "ai-service"))

try:
    from european_logistics import EuropeanLogisticsService
except ImportError:
    print("⚠️ No se pudo importar EuropeanLogisticsService, usando simulación")
    EuropeanLogisticsService = None

class QuotationGenerator:
    def __init__(self):
        self.project_root = Path("/home/rypcloud/Documentos/Logistic/POC/stock-logistic-poc")
        self.logistics_service = EuropeanLogisticsService() if EuropeanLogisticsService else None

    def generate_professional_quotation(self, session_data):
        """Generar cotización profesional completa"""
        try:
            # 1. Preparar datos para el servicio de logística
            quote_request = {
                "origin": session_data["origin"],
                "destination": session_data["destination"],
                "weight_kg": session_data["weight_kg"],
                "cargo_type": session_data["cargo_type"],
                "pickup_date": session_data["pickup_date"]
            }

            # 2. Generar cotización usando el servicio europeo
            if self.logistics_service:
                quote_result = self.logistics_service.generate_european_quote(quote_request)
                if not quote_result:
                    raise Exception("Error generando cotización con servicio europeo")
            else:
                quote_result = self._fallback_quotation(quote_request)

            # 3. Enriquecer con datos de la empresa
            quote_result["company_data"] = session_data["company_data"]

            # 4. Generar alternativas de servicio
            alternatives = self._generate_service_alternatives(quote_result)
            quote_result["service_alternatives"] = alternatives

            # 5. Generar documento PDF/HTML profesional
            document_paths = self._generate_professional_documents(quote_result)
            quote_result["documents"] = document_paths

            # 6. Preparar datos para frontend
            frontend_data = self._prepare_frontend_data(quote_result)

            return {
                "success": True,
                "quotation": quote_result,
                "frontend_data": frontend_data,
                "documents": document_paths
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "quotation": None
            }

    def _fallback_quotation(self, quote_request):
        """Cotización de fallback cuando el servicio principal no está disponible"""
        print("🔄 Usando cotización de fallback")

        weight_kg = quote_request["weight_kg"]
        distance_km = self._estimate_distance(quote_request["origin"], quote_request["destination"])

        # Tarifas base por tipo de carga
        base_rates = {
            'carga_general': 1.20,
            'carga_fragil': 1.80,
            'electronica': 2.10,
            'quimicos': 2.50,
            'alimentarios': 1.60,
            'refrigerado': 2.20,
            'peligrosa': 3.00
        }

        rate = base_rates.get(quote_request["cargo_type"], base_rates["carga_general"])
        transport_cost = (weight_kg * rate * distance_km) / 100
        fuel_cost = distance_km * 0.35
        toll_cost = distance_km * 0.12
        insurance_cost = max(weight_kg * 0.05, 50)

        total_cost = transport_cost + fuel_cost + toll_cost + insurance_cost

        return {
            "origen": quote_request["origin"],
            "destino": quote_request["destination"],
            "peso_kg": weight_kg,
            "tipo_carga": quote_request["cargo_type"],
            "tipo_transporte": "terrestre",
            "distancia_km": distance_km,
            "fecha_recogida": quote_request["pickup_date"],
            "costo_transporte_eur": round(transport_cost, 2),
            "costo_combustible_eur": round(fuel_cost, 2),
            "costo_peajes_eur": round(toll_cost, 2),
            "costo_seguro_eur": round(insurance_cost, 2),
            "costo_total_eur": round(total_cost, 2),
            "tiempo_estimado_dias": max(1, round(distance_km / 500)),
            "restricciones": [],
            "alertas_criticas": 0,
            "validez_dias": 7
        }

    def _estimate_distance(self, origin, destination):
        """Estimar distancia entre ciudades"""
        distance_estimates = {
            ("madrid", "parís"): 1270,
            ("madrid", "berlín"): 1870,
            ("madrid", "roma"): 1410,
            ("barcelona", "parís"): 830,
            ("barcelona", "milán"): 950,
            ("valencia", "roma"): 1100,
            ("sevilla", "lisboa"): 315
        }

        key = (origin.lower(), destination.lower())
        reverse_key = (destination.lower(), origin.lower())

        return distance_estimates.get(key, distance_estimates.get(reverse_key, 1000))

    def _generate_service_alternatives(self, base_quote):
        """Generar alternativas de servicio (económica, estándar, express)"""
        base_cost = base_quote["costo_total_eur"]

        alternatives = [
            {
                "tipo": "económica",
                "descripcion": "Servicio estándar con tiempo de entrega extendido",
                "precio_eur": round(base_cost * 0.85, 2),
                "tiempo_dias": base_quote["tiempo_estimado_dias"] + 2,
                "caracteristicas": [
                    "Entrega en horario estándar",
                    "Seguimiento básico",
                    "Seguro incluido"
                ]
            },
            {
                "tipo": "estándar",
                "descripcion": "Nuestro servicio más popular con excelente relación calidad-precio",
                "precio_eur": base_cost,
                "tiempo_dias": base_quote["tiempo_estimado_dias"],
                "caracteristicas": [
                    "Seguimiento en tiempo real",
                    "Seguro completo",
                    "Soporte 24/7",
                    "Entrega en horario laboral"
                ],
                "recomendado": True
            },
            {
                "tipo": "express",
                "descripcion": "Servicio prioritario con entrega garantizada",
                "precio_eur": round(base_cost * 1.25, 2),
                "tiempo_dias": max(1, base_quote["tiempo_estimado_dias"] - 1),
                "caracteristicas": [
                    "Entrega prioritaria",
                    "Seguimiento GPS en tiempo real",
                    "Seguro premium",
                    "Soporte dedicado",
                    "Entrega en horario extendido"
                ]
            }
        ]

        return alternatives

    def _generate_professional_documents(self, quotation):
        """Generar documentos profesionales (PDF/HTML)"""
        documents_dir = self.project_root / "generated_documents"
        documents_dir.mkdir(exist_ok=True)

        quote_id = f"SL-{datetime.now().strftime('%Y%m%d')}-{hash(str(quotation)) % 10000:04d}"

        # Generar HTML
        html_content = self._generate_html_quotation(quotation, quote_id)
        html_file = documents_dir / f"{quote_id}.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)

        # Generar JSON para frontend
        json_file = documents_dir / f"{quote_id}.json"
        quotation_data = {
            "quote_id": quote_id,
            "created_at": datetime.now().isoformat(),
            **quotation
        }
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(quotation_data, f, indent=2, ensure_ascii=False)

        return {
            "html": str(html_file),
            "json": str(json_file),
            "quote_id": quote_id
        }

    def _generate_html_quotation(self, quotation, quote_id):
        """Generar cotización en formato HTML profesional"""
        template_str = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización {{ quote_id }} - Stock Logistic</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; margin: -30px -30px 30px; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 16px; opacity: 0.9; }
        .quote-id { background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 20px; display: inline-block; margin-top: 15px; font-family: monospace; }
        .section { margin: 25px 0; padding: 20px; background: #f8fafc; border-left: 4px solid #3b82f6; }
        .section h3 { margin: 0 0 15px; color: #1e3a8a; font-size: 18px; }
        .route-info { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; margin: 20px 0; }
        .city { text-align: center; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .arrow { font-size: 24px; color: #3b82f6; }
        .cost-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .cost-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .cost-total { background: #1e3a8a; color: white; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center; font-size: 18px; font-weight: bold; }
        .alternatives { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .alternative { border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; text-align: center; transition: all 0.3s; }
        .alternative.recommended { border-color: #3b82f6; background: linear-gradient(135deg, #dbeafe, #eff6ff); }
        .alternative h4 { margin: 0 0 10px; color: #1e3a8a; text-transform: uppercase; font-size: 16px; }
        .price { font-size: 24px; font-weight: bold; color: #059669; margin: 10px 0; }
        .features { list-style: none; padding: 0; margin: 15px 0; }
        .features li { padding: 5px 0; color: #6b7280; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .alert.critical { background: #fee2e2; border-color: #ef4444; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
        .validity { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚚 STOCK LOGISTIC</div>
            <div class="subtitle">Transporte Terrestre Europeo Especializado</div>
            <div class="quote-id">{{ quote_id }}</div>
        </div>

        <div class="section">
            <h3>📍 Información de la Ruta</h3>
            <div class="route-info">
                <div class="city">
                    <strong>{{ quotation.origen|title }}</strong><br>
                    <small>ORIGEN</small>
                </div>
                <div class="arrow">✈️</div>
                <div class="city">
                    <strong>{{ quotation.destino|title }}</strong><br>
                    <small>DESTINO</small>
                </div>
            </div>
            <p><strong>Distancia:</strong> {{ quotation.distancia_km }} km</p>
            <p><strong>Tiempo estimado:</strong> {{ quotation.tiempo_estimado_dias }} días laborables</p>
            <p><strong>Fecha de recogida:</strong> {{ quotation.fecha_recogida }}</p>
        </div>

        <div class="section">
            <h3>📦 Detalles de la Mercancía</h3>
            <p><strong>Peso:</strong> {{ quotation.peso_kg }} kg</p>
            <p><strong>Tipo de carga:</strong> {{ quotation.tipo_carga|replace('_', ' ')|title }}</p>
            <p><strong>Modalidad:</strong> {{ quotation.tipo_transporte|title }}</p>
        </div>

        {% if quotation.company_data %}
        <div class="section">
            <h3>🏢 Datos de la Empresa</h3>
            {% if quotation.company_data.name %}<p><strong>Empresa:</strong> {{ quotation.company_data.name }}</p>{% endif %}
            {% if quotation.company_data.contact_person %}<p><strong>Contacto:</strong> {{ quotation.company_data.contact_person }}</p>{% endif %}
            {% if quotation.company_data.email %}<p><strong>Email:</strong> {{ quotation.company_data.email }}</p>{% endif %}
            {% if quotation.company_data.phone %}<p><strong>Teléfono:</strong> {{ quotation.company_data.phone }}</p>{% endif %}
        </div>
        {% endif %}

        <div class="section">
            <h3>💰 Desglose de Costos</h3>
            <div class="cost-breakdown">
                <div>
                    <div class="cost-item">
                        <span>Transporte base</span>
                        <span>€{{ "%.2f"|format(quotation.costo_transporte_eur) }}</span>
                    </div>
                    <div class="cost-item">
                        <span>Combustible</span>
                        <span>€{{ "%.2f"|format(quotation.costo_combustible_eur) }}</span>
                    </div>
                    <div class="cost-item">
                        <span>Peajes</span>
                        <span>€{{ "%.2f"|format(quotation.costo_peajes_eur) }}</span>
                    </div>
                    <div class="cost-item">
                        <span>Seguro</span>
                        <span>€{{ "%.2f"|format(quotation.costo_seguro_eur) }}</span>
                    </div>
                </div>
            </div>
            <div class="cost-total">
                TOTAL: €{{ "%.2f"|format(quotation.costo_total_eur) }}
            </div>
        </div>

        {% if quotation.service_alternatives %}
        <div class="section">
            <h3>🎯 Alternativas de Servicio</h3>
            <div class="alternatives">
                {% for alt in quotation.service_alternatives %}
                <div class="alternative {% if alt.recomendado %}recommended{% endif %}">
                    <h4>{{ alt.tipo }}</h4>
                    <div class="price">€{{ "%.2f"|format(alt.precio_eur) }}</div>
                    <p>{{ alt.tiempo_dias }} días</p>
                    <p style="font-size: 12px; color: #6b7280;">{{ alt.descripcion }}</p>
                    {% if alt.recomendado %}<div style="color: #3b82f6; font-weight: bold; margin-top: 10px;">⭐ RECOMENDADO</div>{% endif %}
                </div>
                {% endfor %}
            </div>
        </div>
        {% endif %}

        {% if quotation.restricciones %}
        <div class="section">
            <h3>⚠️ Restricciones y Alertas</h3>
            {% for restriction in quotation.restricciones %}
            <div class="alert">{{ restriction }}</div>
            {% endfor %}
        </div>
        {% endif %}

        <div class="validity">
            <strong>⏰ Esta cotización es válida por {{ quotation.validez_dias }} días</strong><br>
            Generado el {{ datetime.now().strftime('%d/%m/%Y a las %H:%M') }}
        </div>

        <div class="footer">
            <p><strong>Stock Logistic S.L.</strong> - Especialistas en Transporte Terrestre Europeo</p>
            <p>📧 info@stocklogistic.com | 📞 +34 XXX XXX XXX | 🌐 www.stocklogistic.com</p>
            <p>Esta cotización ha sido generada automáticamente por nuestro sistema inteligente LUC1-COMEX</p>
        </div>
    </div>
</body>
</html>
        """

        template = Template(template_str)
        return template.render(
            quotation=quotation,
            quote_id=quote_id,
            datetime=datetime
        )

    def _prepare_frontend_data(self, quotation):
        """Preparar datos para el frontend React"""
        return {
            "type": "quotation",
            "status": "completed",
            "route": {
                "origin": quotation["origen"],
                "destination": quotation["destino"],
                "distance_km": quotation["distancia_km"],
                "estimated_days": quotation["tiempo_estimado_dias"]
            },
            "cargo": {
                "weight_kg": quotation["peso_kg"],
                "type": quotation["tipo_carga"],
                "transport_type": quotation["tipo_transporte"]
            },
            "cost": {
                "transport": quotation["costo_transporte_eur"],
                "fuel": quotation["costo_combustible_eur"],
                "tolls": quotation["costo_peajes_eur"],
                "insurance": quotation["costo_seguro_eur"],
                "total": quotation["costo_total_eur"]
            },
            "alternatives": quotation.get("service_alternatives", []),
            "restrictions": quotation.get("restricciones", []),
            "critical_alerts": quotation.get("alertas_criticas", 0),
            "validity_days": quotation["validez_dias"],
            "pickup_date": quotation["fecha_recogida"],
            "company_data": quotation.get("company_data", {})
        }

# Función principal para el agent
def generate_quotation_from_session(session_data):
    """Función principal para generar cotización desde datos de sesión"""
    generator = QuotationGenerator()
    result = generator.generate_professional_quotation(session_data)

    if result["success"]:
        print(f"✅ Cotización generada exitosamente!")
        print(f"📄 ID: {result['documents']['quote_id']}")
        print(f"💰 Total: €{result['quotation']['costo_total_eur']}")
        print(f"📁 Documentos en: {result['documents']['html']}")
        return result
    else:
        print(f"❌ Error generando cotización: {result['error']}")
        return None

if __name__ == "__main__":
    # Test de generación
    test_session = {
        "origin": "Madrid",
        "destination": "París",
        "weight_kg": 2500,
        "cargo_type": "carga_general",
        "pickup_date": "2025-10-15",
        "company_data": {
            "name": "Empresa Test S.L.",
            "contact_person": "Juan Pérez",
            "email": "juan@test.com",
            "phone": "+34 600 000 000"
        }
    }

    result = generate_quotation_from_session(test_session)
    if result:
        print(f"🎉 Test completado exitosamente!")