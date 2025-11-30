"""
LUCI (LUC1) - Ollama Gemma Model Handler con Preguntas Secuenciales
Handles inference for Gemma 1B model via Ollama API con flujo de preguntas paso a paso
"""

import requests
import json
from typing import Optional, Dict, List
from loguru import logger
import os
from pathlib import Path
import re
from european_logistics import EuropeanLogisticsService

class GemmaHandler:
    def __init__(self, model_name: str = "gemma3:1b", ollama_url: str = "http://localhost:11434"):
        """
        Initialize LUCI with Ollama Gemma model

        Args:
            model_name: Ollama model name
            ollama_url: Ollama server URL
        """
        self.model_name = model_name
        self.ollama_url = ollama_url
        self.is_loaded = False
        self.conversation_context = {}  # Para mantener contexto de conversaciones

        # Inicializar servicio de logística europea
        self.logistics_service = EuropeanLogisticsService()

        # Sistema de preguntas secuenciales para cotizaciones
        self.quote_questions = [
            {
                'field': 'origin',
                'question': '📍 ¿Desde qué ciudad española deseas enviar la mercancía?\n\nCiudades disponibles: Madrid, Barcelona, Valencia, Sevilla, Bilbao, Zaragoza, Málaga, Murcia, Palma, Las Palmas, Alicante, Córdoba, Valladolid, Vigo, Gijón, Santander',
                'validation': lambda x: any(city.lower() in x.lower() for city in ['madrid', 'barcelona', 'valencia', 'sevilla', 'bilbao', 'zaragoza', 'málaga', 'murcia', 'palma', 'las palmas', 'alicante', 'córdoba', 'valladolid', 'vigo', 'gijón', 'santander'])
            },
            {
                'field': 'destination',
                'question': '🎯 ¿A qué ciudad europea quieres enviar la mercancía?\n\nPrincipales destinos: París, Berlín, Roma, Ámsterdam, Bruselas, Zurich, Viena, Lisboa, Praga, Varsovia',
                'validation': lambda x: any(city.lower() in x.lower() for city in ['parís', 'berlín', 'roma', 'ámsterdam', 'bruselas', 'zurich', 'viena', 'lisboa', 'praga', 'varsovia', 'lyon', 'marsella', 'múnich', 'hamburgo', 'frankfurt', 'milán', 'nápoles', 'róterdam', 'amberes', 'ginebra'])
            },
            {
                'field': 'weight',
                'question': '⚖️ ¿Cuál es el peso total de la mercancía?\n\nPor favor indica el peso en kilogramos (kg) o toneladas (t)\nEjemplo: 1500 kg o 1.5 t',
                'validation': lambda x: any(unit in x.lower() for unit in ['kg', 'kilos', 'toneladas', 't']) and any(char.isdigit() for char in x)
            },
            {
                'field': 'cargo_type',
                'question': '📦 ¿Qué tipo de mercancía vas a enviar?\n\nOpciones disponibles:\n• General - Mercancía estándar\n• Frágil - Productos delicados\n• Electrónica - Equipos electrónicos\n• Químicos - Productos químicos (ADR)\n• Alimentarios - Productos alimenticios\n• Refrigerado - Productos que requieren frío\n• Peligrosa - Mercancía peligrosa',
                'validation': lambda x: any(cargo.lower() in x.lower() for cargo in ['general', 'frágil', 'electrónica', 'químicos', 'alimentarios', 'refrigerado', 'peligrosa', 'fragil', 'electronica', 'quimicos'])
            },
            {
                'field': 'pickup_date',
                'question': '📅 ¿Cuándo necesitas recoger la mercancía?\n\nPuedes indicar:\n• Una fecha específica (DD/MM/AAAA)\n• "lo antes posible"\n• "la próxima semana"\n• "en 3 días"',
                'validation': lambda x: len(x.strip()) > 0
            },
            {
                'field': 'company_info',
                'question': '🏢 Para finalizar, necesito los datos de tu empresa:\n\n• Nombre de la empresa\n• Email de contacto\n• Teléfono (opcional)\n\nEjemplo: "Transportes García S.L., contacto@empresa.com, +34 123 456 789"',
                'validation': lambda x: '@' in x and len(x.strip()) > 10
            }
        ]

        self.session_data = {}

        self.system_prompt = """
Eres LUC1, el asistente inteligente de logística terrestre europea especializado en transporte desde España.

MODO INTERACTIVO:
- Realizas preguntas secuenciales para recopilar todos los datos necesarios
- Una pregunta a la vez, de forma conversacional y amigable
- Validas cada respuesta antes de continuar
- Al completar todos los datos, generas la cotización automáticamente

CAPACIDADES:
- Solicitar datos paso a paso para cotizaciones
- Generar cotizaciones profesionales con cálculos reales
- Abrir automáticamente la cotización generada en el sistema
- Proporcionar información sobre restricciones de tráfico y peajes

INSTRUCCIONES:
1. Si es saludo o consulta general: responde amigablemente
2. Si detectas intención de cotizar: inicia proceso secuencial
3. Si estás en proceso de cotización: continúa con la siguiente pregunta
4. Si se completan todos los datos: genera cotización y abre resultado
5. SIEMPRE responde en español con tono profesional pero cercano
"""

        logger.info(f"🤖 LUCI initialized with Ollama model: {model_name}")
        logger.info("🚚 European Logistics Service initialized for road transport")

    def load_model(self):
        """Check Ollama connection and model availability"""
        if self.is_loaded:
            logger.info("Model already loaded")
            return

        try:
            logger.info(f"Connecting to Ollama with model: {self.model_name}")

            # Test connection to Ollama
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]

                if self.model_name in model_names:
                    logger.success(f"✅ LUCI connected to Ollama with {self.model_name}")
                    self.is_loaded = True
                else:
                    logger.error(f"❌ Model {self.model_name} not found in Ollama")
                    logger.info(f"Available models: {model_names}")
            else:
                logger.error(f"❌ Failed to connect to Ollama: {response.status_code}")

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Ollama connection error: {e}")
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")

    def get_next_question(self, session_id):
        """Obtener la siguiente pregunta para la sesión"""
        if session_id not in self.session_data:
            self.session_data[session_id] = {'step': 0, 'data': {}}

        session = self.session_data[session_id]

        if session['step'] >= len(self.quote_questions):
            return None  # Todas las preguntas completadas

        return self.quote_questions[session['step']]

    def process_answer(self, session_id, answer):
        """Procesar la respuesta del usuario"""
        if session_id not in self.session_data:
            return False, "Sesión no encontrada"

        session = self.session_data[session_id]
        question = self.quote_questions[session['step']]

        # Validar respuesta
        if question['validation'](answer):
            session['data'][question['field']] = answer
            session['step'] += 1
            return True, "Respuesta válida"
        else:
            return False, "Respuesta inválida, por favor intenta de nuevo"

    def is_quote_complete(self, session_id):
        """Verificar si se completaron todas las preguntas"""
        if session_id not in self.session_data:
            return False
        return self.session_data[session_id]['step'] >= len(self.quote_questions)

    def reset_session(self, session_id):
        """Reiniciar sesión de cotización"""
        if session_id in self.session_data:
            del self.session_data[session_id]

    def parse_session_data(self, session_data):
        """Convertir datos de sesión al formato esperado"""
        try:
            # Extraer peso y convertir a kg
            weight_text = session_data.get('weight', '1000 kg')
            weight_kg = 1000  # default

            if 'kg' in weight_text.lower():
                weight_match = re.search(r'(\d+(?:\.\d+)?)', weight_text)
                if weight_match:
                    weight_kg = float(weight_match.group(1))
            elif 't' in weight_text.lower():
                weight_match = re.search(r'(\d+(?:\.\d+)?)', weight_text)
                if weight_match:
                    weight_kg = float(weight_match.group(1)) * 1000

            # Mapear tipo de carga
            cargo_text = session_data.get('cargo_type', 'general').lower()
            cargo_type = 'carga_general'
            if 'frágil' in cargo_text or 'fragil' in cargo_text:
                cargo_type = 'carga_fragil'
            elif 'electrónica' in cargo_text or 'electronica' in cargo_text:
                cargo_type = 'electronica'
            elif 'químicos' in cargo_text or 'quimicos' in cargo_text:
                cargo_type = 'quimicos'
            elif 'alimentarios' in cargo_text:
                cargo_type = 'alimentarios'
            elif 'refrigerado' in cargo_text:
                cargo_type = 'refrigerado'
            elif 'peligrosa' in cargo_text:
                cargo_type = 'peligrosa'

            return {
                'weight_kg': weight_kg,
                'origin': session_data.get('origin', 'Madrid'),
                'destination': session_data.get('destination', 'París'),
                'cargo_type': cargo_type,
                'transport_type': 'terrestre',
                'pickup_date': session_data.get('pickup_date'),
                'company_info': session_data.get('company_info')
            }
        except Exception as e:
            logger.error(f"Error parsing session data: {e}")
            return {
                'weight_kg': 1000,
                'origin': 'Madrid',
                'destination': 'París',
                'cargo_type': 'carga_general',
                'transport_type': 'terrestre'
            }

    def generate_response(self, message, session_id='default'):
        """Generate response using Ollama API with sequential questioning"""
        logger.info("🤖 LUC1 generating response...")

        try:
            # Verificar si el usuario está en un proceso de cotización activo
            if session_id in self.session_data:
                # Procesar respuesta a pregunta actual
                is_valid, validation_msg = self.process_answer(session_id, message)

                if is_valid:
                    # Verificar si se completaron todas las preguntas
                    if self.is_quote_complete(session_id):
                        # Generar cotización con los datos recopilados
                        session_data = self.session_data[session_id]['data']
                        quote_data = self.parse_session_data(session_data)

                        logger.info(f"Datos de sesión completos: {quote_data}")

                        # Generar cotización
                        quote = self.generate_quote(quote_data)
                        if quote:
                            # Limpiar sesión
                            self.reset_session(session_id)

                            # Generar respuesta con cotización y comando de apertura
                            quote_response = self.format_european_quote(quote)

                            # Agregar comando para abrir cotización (será procesado por el frontend)
                            return f"{quote_response}\n\n🔗 **ACCIÓN**: ABRIR_COTIZACIÓN_{quote.get('validez_dias', 'nueva')}"
                        else:
                            self.reset_session(session_id)
                            return "❌ Hubo un problema generando la cotización. Por favor, intenta nuevamente."
                    else:
                        # Hacer siguiente pregunta
                        next_question = self.get_next_question(session_id)
                        return f"✅ Perfecto!\n\n{next_question['question']}"
                else:
                    # Repetir pregunta actual
                    current_question = self.quote_questions[self.session_data[session_id]['step']]
                    return f"❌ {validation_msg}\n\n{current_question['question']}"

            # Verificar si es una nueva solicitud de cotización
            elif self.is_quote_request(message):
                logger.info("Nueva cotización detectada, iniciando proceso secuencial...")

                # Iniciar proceso de preguntas
                first_question = self.get_next_question(session_id)
                return f"¡Perfecto! Te ayudo a generar una cotización de transporte terrestre europeo. 🚚\n\nVamos paso a paso:\n\n{first_question['question']}"

            else:
                # Respuesta conversacional normal
                prompt = f"{self.system_prompt}\n\nUsuario: {message}\n\nLUC1:"

                response = requests.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                            "max_tokens": 500
                        }
                    },
                    timeout=30
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get('response', 'Error en la respuesta')
                else:
                    logger.error(f"Error en Ollama: {response.status_code}")
                    return "Disculpa, tengo problemas técnicos en este momento."

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "Lo siento, encontré un problema procesando tu solicitud."

    def is_quote_request(self, message):
        """Detect if message is a quote request"""
        quote_keywords = [
            'cotización', 'cotizacion', 'precio', 'costo', 'coste',
            'enviar', 'envío', 'envio', 'transporte', 'trasladar',
            'cuánto', 'cuanto', 'qué precio', 'que precio',
            'tarifa', 'presupuesto', 'quote'
        ]

        message_lower = message.lower()
        return any(keyword in message_lower for keyword in quote_keywords)

    def generate_quote(self, quote_data):
        """Generate quote using European logistics service"""
        logger.info("🚚 Generando cotización de transporte terrestre europeo...")
        try:
            quote = self.logistics_service.generate_european_quote(quote_data)
            return quote
        except Exception as e:
            logger.error("No se pudo generar cotización europea")
            return None

    def format_european_quote(self, quote):
        """Format European transport quote for display"""
        if not quote:
            return "❌ Error: No se pudo generar la cotización"

        try:
            response = f"""🚚 **COTIZACIÓN TRANSPORTE TERRESTRE EUROPEO - LUC1**

**DETALLES DEL ENVÍO:**
🇪🇸 Origen: {quote.get('origen', 'Madrid')}, España
🎯 Destino: {quote.get('destino', 'Destino')}
⚖️ Peso: {quote.get('peso_kg', 0)} kg
📋 Tipo de carga: {quote.get('tipo_carga', 'General').replace('_', ' ').title()}
🚛 Transporte: {quote.get('tipo_transporte', 'Terrestre').title()}
📏 Distancia: {quote.get('distancia_km', 0)} km
🗺️ Países de tránsito: {', '.join(quote.get('paises_transito', []))}
📅 Fecha recogida: {quote.get('fecha_recogida', 'No especificada')}

**COSTOS DETALLADOS (EUR):**
🚚 Transporte: €{quote.get('costo_transporte_eur', 0):.2f}
⛽ Combustible: €{quote.get('costo_combustible_eur', 0):.2f}
🛣️ Peajes: €{quote.get('costo_peajes_eur', 0):.2f}
🛡️ Seguro: €{quote.get('costo_seguro_eur', 0):.2f}

💶 **TOTAL: €{quote.get('costo_total_eur', 0):.2f} EUR**

⏰ **TIEMPOS:**
📦 Entrega estimada: {quote.get('tiempo_estimado_dias', 1)} día(s)
🚗 Horas de conducción: {quote.get('horas_conduccion', 0)} h

📋 **VEHÍCULO ASIGNADO:** {quote.get('vehiculo', {}).get('type', 'Van').title()} - {quote.get('vehiculo', {}).get('weight', 1.0)}t
📅 **VALIDEZ:** {quote.get('validez_dias', 7)} días

¿Necesitas información sobre restricciones específicas o ajustar la fecha?"""

            return response

        except Exception as e:
            logger.error(f"Error formatting quote: {e}")
            return "❌ Error formateando la cotización"

    def health_check(self):
        """Check if the model is healthy and ready"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            return response.status_code == 200 and self.is_loaded
        except:
            return False