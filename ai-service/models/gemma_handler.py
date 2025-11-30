"""
LUCI (LUC1) - Ollama Gemma Model Handler
Handles inference for Gemma 1B model via Ollama API
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
                    self.is_loaded = True
                    logger.success(f"✅ LUCI connected to Ollama with {self.model_name}")
                else:
                    logger.warning(f"⚠️ Model {self.model_name} not found. Available: {model_names}")
                    self.is_loaded = False
            else:
                logger.error("❌ Cannot connect to Ollama server")
                self.is_loaded = False

        except Exception as e:
            logger.error(f"❌ Ollama connection error: {e}")
            self.is_loaded = False

    def extract_quote_data(self, text):
        """
        Extrae datos de cotización del texto del usuario usando regex y análisis
        """
        data = {}

        # Detectar peso
        weight_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilogramos?)',
            r'(\d+(?:\.\d+)?)\s*(?:ton|toneladas?)',
            r'peso[:\s]*(\d+(?:\.\d+)?)',
        ]

        for pattern in weight_patterns:
            match = re.search(pattern, text.lower())
            if match:
                weight = float(match.group(1))
                if 'ton' in pattern:
                    weight *= 1000  # Convertir a kg
                data['weight_kg'] = weight
                break

        # Detectar dimensiones
        dimension_pattern = r'(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:cm|metros?|m)'
        match = re.search(dimension_pattern, text.lower())
        if match:
            l, w, h = map(float, match.groups())
            # Convertir a metros si está en cm
            if 'cm' in text.lower():
                l, w, h = l/100, w/100, h/100
            data['volume_m3'] = l * w * h

        # Detectar origen (siempre desde España) y destino (ciudades europeas)
        spanish_cities = ['madrid', 'barcelona', 'valencia', 'sevilla', 'bilbao', 'zaragoza', 'málaga']
        european_destinations = {
            'francia': ['parís', 'lyon', 'marsella', 'toulouse', 'niza', 'burdeos'],
            'alemania': ['berlín', 'múnich', 'hamburgo', 'frankfurt', 'colonia', 'stuttgart'],
            'italia': ['roma', 'milán', 'nápoles', 'turín', 'florencia', 'venecia'],
            'países bajos': ['ámsterdam', 'róterdam', 'la haya', 'utrecht'],
            'bélgica': ['bruselas', 'amberes', 'gante', 'brujas'],
            'suiza': ['zurich', 'ginebra', 'berna', 'basilea'],
            'austria': ['viena', 'salzburgo', 'innsbruck', 'graz'],
            'portugal': ['lisboa', 'oporto', 'braga', 'coimbra'],
            'república checa': ['praga', 'brno', 'ostrava'],
            'polonia': ['varsovia', 'cracovia', 'gdansk', 'wrocław']
        }

        # Origen por defecto siempre España (Madrid si no se especifica)
        data['origin'] = 'Madrid'

        # Detectar ciudad de origen española específica
        for city in spanish_cities:
            if city in text.lower():
                if 'desde' in text.lower() or 'madrid' in text.lower():
                    data['origin'] = city.title()
                    break

        # Detectar destino europeo
        found_destination = False

        # Buscar ciudades específicas primero
        for country, cities in european_destinations.items():
            for city in cities:
                if city in text.lower():
                    data['destination'] = city.title()
                    data['destination_country'] = country.title()
                    found_destination = True
                    break
            if found_destination:
                break

        # Si no se encontró ciudad específica, buscar por país
        if not found_destination:
            for country in european_destinations.keys():
                if country in text.lower():
                    data['destination'] = country.title()
                    data['destination_country'] = country.title()
                    found_destination = True
                    break

        # Detectar tipo de carga
        cargo_types = {
            'electrónicos': 'electronica',
            'electrónica': 'electronica',
            'computadores': 'electronica',
            'móviles': 'electronica',
            'frágil': 'carga_fragil',
            'delicado': 'carga_fragil',
            'químicos': 'quimicos',
            'químico': 'quimicos',
            'alimentos': 'alimentarios',
            'comida': 'alimentarios'
        }

        for key, value in cargo_types.items():
            if key in text.lower():
                data['cargo_type'] = value
                break

        # Detectar tipo de transporte
        transport_types = {
            'aéreo': 'aereo',
            'avión': 'aereo',
            'aire': 'aereo',
            'marítimo': 'maritimo',
            'barco': 'maritimo',
            'mar': 'maritimo',
            'terrestre': 'terrestre',
            'carretera': 'terrestre',
            'camión': 'terrestre'
        }

        for key, value in transport_types.items():
            if key in text.lower():
                data['transport_type'] = value
                break

        # Detectar valor declarado
        value_pattern = r'valor[:\s]*(?:usd?)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'
        match = re.search(value_pattern, text.lower())
        if match:
            value_str = match.group(1).replace(',', '')
            data['declared_value'] = float(value_str)

        return data

    def generate_quote(self, quote_data):
        """
        Genera una cotización real para transporte terrestre europeo
        """
        try:
            logger.info("🚚 Generando cotización de transporte terrestre europeo...")

            # Usar el servicio de logística europea
            quote = self.logistics_service.generate_european_quote(quote_data)

            if not quote:
                logger.error("No se pudo generar cotización europea")
                return None

            logger.info(f"✅ Cotización generada: {quote['origen']} → {quote['destino']}")
            return quote

        except Exception as e:
            logger.error(f"Error generating European quote: {e}")
            return None

    def format_quote_response(self, quote):
        """
        Formatea la cotización europea en un texto profesional
        """
        if not quote:
            return "No pude generar la cotización con los datos proporcionados. Por favor, proporciona más detalles sobre el destino europeo."

        response = f"""
🚚 **COTIZACIÓN TRANSPORTE TERRESTRE EUROPEO - LUC1**

**DETALLES DEL ENVÍO:**
🇪🇸 Origen: {quote['origen']}, España
🎯 Destino: {quote['destino']}
⚖️ Peso: {quote['peso_kg']} kg
📋 Tipo de carga: {quote['tipo_carga'].replace('_', ' ').title()}
🚛 Transporte: {quote['tipo_transporte'].title()}
📏 Distancia: {quote['distancia_km']} km
🗺️ Países de tránsito: {', '.join(quote.get('paises_transito', []))}
📅 Fecha recogida: {quote['fecha_recogida']}

**COSTOS DETALLADOS (EUR):**
🚚 Transporte: €{quote['costo_transporte_eur']:.2f}
⛽ Combustible: €{quote['costo_combustible_eur']:.2f}
🛣️ Peajes: €{quote['costo_peajes_eur']:.2f}
🛡️ Seguro: €{quote['costo_seguro_eur']:.2f}

💶 **TOTAL: €{quote['costo_total_eur']:.2f} EUR**

⏰ **TIEMPOS:**
📦 Entrega estimada: {quote['tiempo_estimado_dias']} día(s)
🚗 Horas de conducción: {quote['horas_conduccion']} h"""

        # Agregar información sobre restricciones si existen
        if quote.get('alertas_criticas', 0) > 0:
            response += f"\n\n⚠️ **ALERTAS IMPORTANTES:** {quote['alertas_criticas']} restricción(es) crítica(s)"

        if quote.get('restricciones'):
            response += "\n🚫 **RESTRICCIONES DETECTADAS:**"
            for restriction in quote['restricciones'][:3]:  # Mostrar máximo 3
                if restriction.get('severity') == 'critical':
                    response += f"\n   🚨 {restriction.get('message', 'Restricción crítica')}"
                elif restriction.get('severity') == 'warning':
                    response += f"\n   ⚠️ {restriction.get('message', 'Advertencia')}"

        if quote.get('festivos_ruta'):
            response += f"\n🎉 **FESTIVOS EN RUTA:** {len(quote['festivos_ruta'])} detectado(s)"

        response += f"\n\n📋 **VEHÍCULO ASIGNADO:** {quote['vehiculo']['type'].title()} - {quote['vehiculo']['weight']}t"
        response += f"\n📅 **VALIDEZ:** {quote['validez_dias']} días"
        response += "\n\n¿Necesitas información sobre restricciones específicas o ajustar la fecha?"

        return response.strip()

    def detect_quote_intent(self, text):
        """
        Detecta si el usuario está solicitando una cotización
        """
        quote_keywords = [
            'cotización', 'cotizacion', 'precio', 'costo', 'tarifa',
            'cuanto cuesta', 'cuánto cuesta', 'precio de envío',
            'enviar', 'transportar', 'llevar', 'mandar'
        ]

        text_lower = text.lower()
        return any(keyword in text_lower for keyword in quote_keywords)

    def generate_response(
        self,
        prompt: str,
        max_length: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate a response from LUCI - Demo mode with smart responses

        Args:
            prompt: User's input message
            max_length: Maximum tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Nucleus sampling parameter
            system_prompt: System instructions for LUCI

        Returns:
            Generated response text
        """
        if not self.is_loaded:
            self.load_model()

        if not self.is_loaded:
            return "❌ LUCI no está disponible en este momento. Por favor, verifica que Ollama esté ejecutándose."

        try:
            # Detectar si el usuario solicita una cotización
            if self.detect_quote_intent(prompt):
                logger.info("Cotización detectada, procesando datos...")

                # Extraer datos de la solicitud
                quote_data = self.extract_quote_data(prompt)
                logger.info(f"Datos extraídos: {quote_data}")

                # Generar cotización
                quote = self.generate_quote(quote_data)

                if quote:
                    return self.format_quote_response(quote)
                else:
                    # Si no se pudo generar cotización automática, pedir más información
                    missing_info = []
                    if not quote_data.get('weight_kg'):
                        missing_info.append("peso")
                    if not quote_data.get('destination'):
                        missing_info.append("destino")
                    if not quote_data.get('origin'):
                        missing_info.append("origen")

                    if missing_info:
                        return f"Para generar una cotización precisa, necesito que me proporciones: {', '.join(missing_info)}. También sería útil conocer el tipo de carga y dimensiones aproximadas."
                    else:
                        return "Encontré un problema generando la cotización. ¿Podrías verificar los datos proporcionados?"

            # Para preguntas generales sobre logística, dar respuestas básicas sin usar Ollama
            general_keywords = ['hola', 'ayuda', 'servicios', 'que haces', 'quien eres']
            if any(keyword in prompt.lower() for keyword in general_keywords):
                return "¡Hola! Soy LUC1, tu asistente especializado en transporte terrestre europeo. Puedo generar cotizaciones desde España hacia cualquier destino en Europa, incluyendo cálculo de peajes, restricciones de tráfico y festivos. ¿A qué destino europeo necesitas enviar?"

            # Si no es solicitud de cotización ni pregunta general, usar respuesta de IA
            default_system = """Eres LUC1, un agente especializado en transporte terrestre europeo desde España. Tu función principal es:

1. GENERAR COTIZACIONES para transporte terrestre desde España hacia destinos europeos
2. Calcular peajes europeos usando TollGuru y OpenRouteService
3. Detectar restricciones de tráfico en tiempo real (DGT España, festivos europeos)
4. Asesorar sobre regulaciones de transporte por carretera en Europa
5. Optimizar rutas considerando restricciones de fin de semana y festivos

IMPORTANTE:
- Origen SIEMPRE desde España (Madrid por defecto)
- Destinos SOLO europeos (Francia, Alemania, Italia, etc.)
- Transporte TERRESTRE exclusivamente (camiones/furgonetas)
- Incluir costos de peajes, combustible y restricciones
- Alertar sobre prohibiciones de circulación (domingos en Alemania/Austria)
- Considerar festivos nacionales que afecten el transporte

Responde siempre en español, enfocado en logística terrestre europea."""

            final_system_prompt = system_prompt if system_prompt else default_system

            # Prepare request for Ollama
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "system": final_system_prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "num_predict": max_length
                }
            }

            # Send request to Ollama
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("response", "No se pudo generar respuesta.")
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return "Error al comunicarse con el modelo de IA."

        except requests.exceptions.Timeout:
            logger.error("Timeout calling Ollama API")
            return "La respuesta está tardando demasiado. Por favor, intenta de nuevo."
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?"

    def generate_streaming_response(
        self,
        prompt: str,
        max_length: int = 512,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ):
        """
        Generate a streaming response from LUCI using Ollama (for real-time chat)
        Yields tokens as they are generated
        """
        if not self.is_loaded:
            self.load_model()

        if not self.is_loaded:
            yield "❌ LUCI no está disponible en este momento."
            return

        try:
            # Default system prompt
            default_system = """Eres LUC1, un asistente inteligente especializado en logística. Responde en español, de forma profesional y útil."""
            final_system_prompt = system_prompt if system_prompt else default_system

            # Prepare request for Ollama streaming
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "system": final_system_prompt,
                "stream": True,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_length
                }
            }

            # Send streaming request to Ollama
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=30,
                stream=True
            )

            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if 'response' in data:
                                yield data['response']
                            if data.get('done', False):
                                break
                        except json.JSONDecodeError:
                            continue
            else:
                yield "Error al comunicarse con el modelo de IA."

        except Exception as e:
            logger.error(f"Error in streaming generation: {e}")
            yield "Error generando respuesta"

    def clear_cache(self):
        """Clear model connection"""
        self.is_loaded = False
        logger.info("Model connection cleared")

# Singleton instance
_luci_instance: Optional[GemmaHandler] = None

def get_luci_instance() -> GemmaHandler:
    """Get or create LUCI instance"""
    global _luci_instance
    if _luci_instance is None:
        _luci_instance = GemmaHandler()
    return _luci_instance