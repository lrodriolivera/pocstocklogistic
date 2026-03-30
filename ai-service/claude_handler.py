#!/usr/bin/env python3
"""
LUC1 - Asistente de Logística con Claude Sonnet 4 API
Manejo de conversaciones y generación de cotizaciones automáticas
"""

import requests
import json
import os
import sys
import time
from datetime import datetime, timedelta
import re
from typing import Dict, List, Optional, Tuple
from loguru import logger

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from european_logistics import EuropeanLogisticsService
    LOGISTICS_SERVICE_AVAILABLE = True
except ImportError:
    LOGISTICS_SERVICE_AVAILABLE = False
    logger.warning("European Logistics Service no disponible, usando simulacion")

MAX_SESSIONS = 100
SESSION_TTL_SECONDS = 30 * 60  # 30 minutes

class LUC1ClaudeHandler:
    SONNET_MODEL = "claude-sonnet-4-20250514"
    HAIKU_MODEL = "claude-haiku-4-5-20251001"

    # Keywords that signal complex logistics reasoning (require Sonnet)
    COMPLEX_KEYWORDS = [
        'cotiza', 'ruta', 'precio', 'transporte', 'analiza', 'envío', 'envio',
        'logística', 'logistica', 'tarifa', 'presupuesto', 'flete', 'aduana',
        'importa', 'exporta', 'almacén', 'almacen', 'palé', 'palet',
    ]

    def __init__(self):
        """Inicializar LUC1 con Claude Sonnet 4 API"""
        self.api_key = os.getenv('CLAUDE_API_KEY', '')
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.model = self.SONNET_MODEL  # Default model (used by analyze_direct)

        # Backend integration
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        self.backend_auth_token = os.getenv('BACKEND_AUTH_TOKEN', '')

        # Sistema de sesiones
        self.sessions = {}
        self.current_session = None

        # Estado de LUC1
        self.is_loaded = True

        # Campos ESENCIALES para generar cotización (datos necesarios para calcular ruta y precio)
        self.required_fields = [
            'origen',  # Ciudad de origen
            'destino',  # Ciudad de destino
            'peso_kg',  # Peso en kg
            'volumen_m3',  # Volumen en m³
            'tipo_carga',  # Tipo de carga (general, forestales, adr, refrigerado, especial)
            'fecha_recogida',  # Fecha de recogida
            'tipo_servicio',  # Tipo de servicio (economico, estandar, express)
        ]

        # Campos opcionales (mejoran la cotización pero no son obligatorios - se usan defaults)
        self.optional_fields = [
            'nombre_empresa',  # Nombre de la empresa cliente (default: "Cliente Genérico")
            'email_cliente',  # Email de contacto (se puede agregar después)
            'nombre_cliente',  # Nombre de contacto
            'telefono_cliente',  # Teléfono
            'margen_utilidad',  # Margen personalizado (default 15%)
            'requiere_seguro',  # Seguro de carga (default true)
            'requiere_tracking',  # Tracking (default true)
            'requiere_firma',  # Firma (default false)
            'valor_carga',  # Valor de la carga
            'descripcion_carga'  # Descripción detallada
        ]

        logger.info("LUC1 con Claude Sonnet 4 API inicializado correctamente")
        logger.info(f"Backend URL: {self.backend_url}")

    def _select_model(self, message: str, session: dict) -> str:
        """Select Haiku for simple queries, Sonnet for complex logistics analysis."""
        quotation_data = session.get('quotation_data', {})
        filled_count = sum(1 for f in self.required_fields if quotation_data.get(f))
        total_required = len(self.required_fields)
        msg_lower = message.lower().strip()

        # Simple greetings / small talk: short message with no logistics keywords
        has_complex_keyword = any(kw in msg_lower for kw in self.COMPLEX_KEYWORDS)

        if len(msg_lower) < 50 and not has_complex_keyword:
            return self.HAIKU_MODEL

        # Simple yes/no confirmations
        if msg_lower in ('sí', 'si', 'no', 'ok', 'vale', 'claro', 'correcto', 'exacto', 'perfecto'):
            return self.HAIKU_MODEL

        # Data extraction from previous context: most fields already filled
        if filled_count >= (total_required - 1) and not has_complex_keyword:
            return self.HAIKU_MODEL

        # Default: use Sonnet for complex reasoning
        return self.SONNET_MODEL

    def cleanup_sessions(self):
        """Remove sessions inactive for more than SESSION_TTL_SECONDS"""
        now = time.time()
        expired = [
            sid for sid, s in self.sessions.items()
            if now - s.get('last_activity', 0) > SESSION_TTL_SECONDS
        ]
        for sid in expired:
            del self.sessions[sid]
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")

    def create_session(self, session_id: str = None) -> str:
        """Crear nueva sesion de conversacion"""
        self.cleanup_sessions()

        if len(self.sessions) >= MAX_SESSIONS:
            raise Exception("Too many active sessions. Try again later.")

        if not session_id:
            session_id = f"session_{int(datetime.now().timestamp())}"

        self.sessions[session_id] = {
            'messages': [],
            'quotation_data': {},
            'current_step': 'greeting',
            'created_at': datetime.now().isoformat(),
            'last_activity': time.time(),
            'completed_fields': set()
        }

        self.current_session = session_id
        return session_id

    def get_system_prompt(self) -> str:
        """Obtener prompt del sistema para LUC1"""
        return """Eres LUC1, un asistente inteligente especializado en logística europea y cotizaciones de transporte.

CONTEXTO IMPORTANTE:
Estás ayudando a un EJECUTIVO COMERCIAL a crear cotizaciones para sus clientes. El ejecutivo comercial te proporcionará los datos del envío y del cliente final.

PERSONALIDAD:
- Eres profesional, eficiente y directo
- Hablas en español de manera natural y fluida
- Eres experto en transporte terrestre europeo desde España
- Eres un asistente del ejecutivo comercial, no interactúas con el cliente final

TU MISIÓN:
Recopilar información del envío paso a paso para generar cotizaciones de transporte terrestre europeo, haciendo UNA pregunta a la vez de manera conversacional. Una vez tengas todos los datos ESENCIALES, genera la cotización automáticamente.

INFORMACIÓN REQUERIDA (todos estos campos son necesarios para generar la cotización):
1. **Origen del envío** (ciudad española, ej: Madrid, Barcelona, Valencia)
2. **Destino del envío** (ciudad europea, ej: París, Berlín, Roma)
3. **Peso total** en kg o toneladas
4. **Volumen** en metros cúbicos (m³) o dimensiones (largo x ancho x alto en metros)
5. **Tipo de carga**: general, forestales, adr (peligrosa), refrigerado, especial
6. **Fecha de recogida** preferida
7. **Tipo de servicio**: Económico (más barato) / Estándar (balance) / Express (más rápido)

INFORMACIÓN OPCIONAL (mejora la cotización, puede agregarse después):
8. Nombre de la empresa cliente (se puede agregar después en el sistema)
9. Email de contacto del cliente (se puede agregar después)
10. Nombre de contacto en la empresa
11. Teléfono de contacto
12. Margen de utilidad personalizado (si no se especifica, usar 15%)
13. Valor de la mercancía (para seguro)
14. Descripción detallada de la carga

REGLAS CRÍTICAS:
- HAZ SOLO UNA PREGUNTA POR RESPUESTA
- NUNCA preguntes por datos que el usuario ya te dio en esta conversación
- Si recibes un mensaje que dice "DATOS YA RECOPILADOS", NO vuelvas a preguntar por esos campos
- Lee CUIDADOSAMENTE el historial de la conversación antes de hacer la siguiente pregunta
- NO preguntes por email, nombre del cliente o empresa - el ejecutivo los puede agregar después
- Continúa solo con los campos que te faltan
- Sé conversacional pero eficiente, el ejecutivo valora su tiempo
- Si el usuario da múltiple información en una respuesta, reconócela toda y pregunta lo siguiente
- Una vez tengas los 7 datos ESENCIALES (origen, destino, peso, volumen, tipo de carga, fecha, tipo de servicio), genera la cotización automáticamente sin pedir confirmación
- Mantén un tono profesional y directo

CIUDADES ESPAÑOLAS VÁLIDAS:
Madrid, Barcelona, Valencia, Sevilla, Zaragoza, Málaga, Murcia, Palma, Las Palmas, Bilbao, Alicante, Córdoba, Valladolid, Vigo, Gijón, La Coruña, Granada, Vitoria, Elche, Santander, Burgos, Salamanca, Tarragona

PAÍSES/CIUDADES EUROPEAS VÁLIDAS (acepta con o sin acentos):
- Francia: París, Lyon, Marsella, Niza, Toulouse, Burdeos
- Alemania: Berlín, Múnich, Hamburgo, Frankfurt, Colonia, Stuttgart
- Italia: Roma, Milán, Nápoles, Turín, Florencia, Venecia
- Países Bajos: Ámsterdam, Róterdam, La Haya, Utrecht
- Bélgica: Bruselas, Amberes, Gante, Brujas
- Suiza: Zurich, Ginebra, Berna, Basilea
- Austria: Viena, Salzburgo, Innsbruck, Graz
- Portugal: Lisboa, Oporto, Braga, Coimbra
- República Checa: Praga, Brno, Ostrava
- Polonia: Varsovia, Cracovia, Gdansk, Wroclaw

TIPOS DE CARGA:
- Carga general: productos estándar, textiles, muebles
- Carga frágil: artículos delicados, cristalería, cerámica
- Electrónica: equipos electrónicos, computadoras, componentes
- Química: productos químicos no peligrosos
- Alimentaria: productos alimenticios secos
- Refrigerada: productos que requieren temperatura controlada
- Peligrosa: mercancías peligrosas (ADR)

Cuando tengas todos los datos, confirma la información y procede a generar la cotización automáticamente."""

    def call_claude_api(self, messages: List[Dict], session_id: str, model: str = None) -> str:
        """Llamar a la API de Claude"""
        selected_model = model or self.model
        try:
            # Preparar los mensajes para la API
            api_messages = []

            # Agregar mensajes de la conversación
            for msg in messages:
                api_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

            logger.info(f"Using model: {selected_model} for session {session_id}")
            logger.debug(f"Mensajes enviados a Claude (Session: {session_id}), total: {len(api_messages)}")
            for i, msg in enumerate(api_messages):
                content_preview = msg['content'][:100] if len(msg['content']) > 100 else msg['content']
                logger.debug(f"  {i+1}. [{msg['role']}] {content_preview}...")

            headers = {
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01"
            }

            payload = {
                "model": selected_model,
                "max_tokens": 2000,
                "temperature": 0.7,
                "system": [
                    {
                        "type": "text",
                        "text": self.get_system_prompt(),
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "messages": api_messages
            }

            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return result["content"][0]["text"]
            else:
                logger.error(f"Error API Claude: {response.status_code} - {response.text}")
                return "Lo siento, tengo problemas técnicos. Por favor, intenta de nuevo."

        except Exception as e:
            logger.error(f"Error en llamada API: {e}")
            return "Disculpa, hay un problema de conexion. Por favor, intenta nuevamente."

    def extract_quotation_data(self, text: str, last_assistant_message: str = "") -> Dict:
        """Extraer datos de cotización del texto del usuario con contexto"""
        data = {}
        text_lower = text.lower()
        last_message_lower = last_assistant_message.lower()

        # Detectar peso
        weight_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilogramos?)',
            r'(\d+(?:\.\d+)?)\s*(?:ton|toneladas?)',
            r'peso[:\s]*(\d+(?:\.\d+)?)',
        ]

        for pattern in weight_patterns:
            match = re.search(pattern, text_lower)
            if match:
                weight = float(match.group(1))
                if 'ton' in pattern:
                    weight *= 1000  # Convertir a kg
                data['peso_kg'] = weight
                break

        # Si no se detectó peso pero el mensaje es solo un número y el asistente preguntó por peso
        if 'peso_kg' not in data and ('peso' in last_message_lower or 'kg' in last_message_lower):
            number_match = re.search(r'^(\d+(?:\.\d+)?)\s*$', text_lower.strip())
            if number_match:
                data['peso_kg'] = float(number_match.group(1))

        # Detectar volumen
        volume_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:m3|m³|metros? c[uú]bicos?)',
            r'volumen[:\s]*(\d+(?:\.\d+)?)',
            r'(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)',  # dimensiones con 'x'
            r'(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)',  # dimensiones separadas por espacios
        ]

        for pattern in volume_patterns:
            match = re.search(pattern, text_lower)
            if match:
                # Verificar si es un patrón de dimensiones (tiene 3 grupos de captura)
                if len(match.groups()) == 3 and all(match.group(i) for i in range(1, 4)):
                    # Calcular volumen desde dimensiones
                    dims = [float(match.group(i)) for i in range(1, 4)]
                    data['volumen_m3'] = dims[0] * dims[1] * dims[2]
                else:
                    data['volumen_m3'] = float(match.group(1))
                break

        # Si no se detectó volumen pero el mensaje es solo un número y el asistente preguntó por volumen
        if 'volumen_m3' not in data and ('volumen' in last_message_lower or 'm³' in last_message_lower or 'm3' in last_message_lower):
            number_match = re.search(r'^(\d+(?:\.\d+)?)\s*$', text_lower.strip())
            if number_match:
                data['volumen_m3'] = float(number_match.group(1))

        # Detectar email
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_match = re.search(email_pattern, text)
        if email_match:
            data['email_cliente'] = email_match.group(0)

        # Detectar nombre de empresa (después de palabras clave)
        company_patterns = [
            r'empresa[:\s]+([A-Z][a-zA-Z\s&,.-]+?)(?:\.|,|$)',
            r'compañ[ií]a[:\s]+([A-Z][a-zA-Z\s&,.-]+?)(?:\.|,|$)',
            r'para[:\s]+([A-Z][a-zA-Z\s&,.-]+?)(?:\.|,|$)',
        ]
        for pattern in company_patterns:
            match = re.search(pattern, text)
            if match:
                data['nombre_empresa'] = match.group(1).strip()
                break

        # Detectar ciudades españolas (origen)
        spanish_cities = [
            'madrid', 'barcelona', 'valencia', 'sevilla', 'zaragoza', 'málaga',
            'murcia', 'palma', 'las palmas', 'bilbao', 'alicante', 'córdoba',
            'valladolid', 'vigo', 'gijón', 'la coruña', 'granada', 'vitoria',
            'elche', 'santander', 'burgos', 'salamanca', 'tarragona'
        ]

        for city in spanish_cities:
            if city in text_lower:
                data['origen'] = city.title()
                break

        # Detectar ciudades europeas (destino)
        european_cities = {
            'parís': 'París', 'paris': 'París', 'lyon': 'Lyon', 'marsella': 'Marsella', 'niza': 'Niza',
            'toulouse': 'Toulouse', 'burdeos': 'Burdeos', 'bordeaux': 'Burdeos',
            'berlín': 'Berlín', 'berlin': 'Berlín', 'múnich': 'Múnich', 'munich': 'Múnich',
            'hamburgo': 'Hamburgo', 'frankfurt': 'Frankfurt', 'colonia': 'Colonia', 'stuttgart': 'Stuttgart',
            'roma': 'Roma', 'milán': 'Milán', 'milan': 'Milán', 'nápoles': 'Nápoles', 'napoles': 'Nápoles',
            'turín': 'Turín', 'turin': 'Turín', 'florencia': 'Florencia', 'venecia': 'Venecia',
            'ámsterdam': 'Ámsterdam', 'amsterdam': 'Ámsterdam', 'róterdam': 'Róterdam', 'rotterdam': 'Róterdam',
            'utrecht': 'Utrecht', 'la haya': 'La Haya',
            'bruselas': 'Bruselas', 'amberes': 'Amberes', 'gante': 'Gante', 'brujas': 'Brujas',
            'zurich': 'Zurich', 'ginebra': 'Ginebra', 'berna': 'Berna', 'basilea': 'Basilea',
            'viena': 'Viena', 'salzburgo': 'Salzburgo', 'innsbruck': 'Innsbruck', 'graz': 'Graz',
            'lisboa': 'Lisboa', 'oporto': 'Oporto', 'braga': 'Braga', 'coimbra': 'Coimbra',
            'praga': 'Praga', 'brno': 'Brno', 'ostrava': 'Ostrava',
            'varsovia': 'Varsovia', 'cracovia': 'Cracovia', 'gdansk': 'Gdansk', 'wroclaw': 'Wroclaw'
        }

        for city_key, city_name in european_cities.items():
            if city_key in text_lower:
                data['destino'] = city_name
                break

        # Detectar tipo de carga (adaptado al schema del backend)
        cargo_types = {
            'general': 'general',
            'estándar': 'general',
            'estandar': 'general',
            'normal': 'general',
            'forestal': 'forestales',
            'madera': 'forestales',
            'tablero': 'forestales',
            'palet': 'forestales',
            'adr': 'adr',
            'peligros': 'adr',
            'dangerous': 'adr',
            'químic': 'adr',  # Captura química/químico/químicos/químicas
            'quimic': 'adr',  # Captura quimica/quimico sin acento
            'refriger': 'refrigerado',
            'frío': 'refrigerado',
            'frio': 'refrigerado',
            'congelad': 'refrigerado',
            'especial': 'especial',
            'frágil': 'especial',
            'fragil': 'especial',
            'delicad': 'especial'
        }

        for keyword, cargo_type in cargo_types.items():
            if keyword in text_lower:
                data['tipo_carga'] = cargo_type
                break

        # Detectar tipo de servicio
        service_types = {
            'económico': 'economico',
            'economico': 'economico',
            'barato': 'economico',
            'estándar': 'estandar',
            'estandar': 'estandar',
            'normal': 'estandar',
            'balance': 'estandar',
            'express': 'express',
            'rápido': 'express',
            'urgente': 'express',
            'premium': 'express'
        }

        for keyword, service_type in service_types.items():
            if keyword in text_lower:
                data['tipo_servicio'] = service_type
                break

        # Si no se especifica tipo de servicio y el asistente preguntó por ello, usar contexto
        if 'tipo_servicio' not in data and ('servicio' in last_message_lower or 'rápido' in last_message_lower or 'velocidad' in last_message_lower):
            for keyword, service_type in service_types.items():
                if keyword in text_lower:
                    data['tipo_servicio'] = service_type
                    break

        # Detectar teléfono
        phone_patterns = [
            r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}',
            r'\d{3}[-\s]?\d{3}[-\s]?\d{3}',
        ]
        for pattern in phone_patterns:
            match = re.search(pattern, text)
            if match and len(match.group(0).replace(' ', '').replace('-', '').replace('+', '')) >= 9:
                data['telefono_cliente'] = match.group(0).strip()
                break

        # Detectar nombre de contacto (sin palabras clave previas)
        if 'empresa' not in text_lower and 'compañía' not in text_lower:
            # Buscar nombres propios (palabras que empiezan con mayúscula)
            name_match = re.search(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b', text)
            if name_match and '@' not in text:  # Evitar confundir emails
                potential_name = name_match.group(1).strip()
                # Filtrar nombres de ciudades conocidas
                if potential_name.lower() not in [city.lower() for city in spanish_cities + list(european_cities.values())]:
                    data['nombre_cliente'] = potential_name

        # Detectar margen de utilidad
        margin_patterns = [
            r'margen[:\s]+(\d+(?:\.\d+)?)\s*%?',
            r'(\d+(?:\.\d+)?)\s*%\s*(?:de\s+)?margen',
            r'utilidad[:\s]+(\d+(?:\.\d+)?)\s*%?',
        ]
        for pattern in margin_patterns:
            match = re.search(pattern, text_lower)
            if match:
                data['margen_utilidad'] = float(match.group(1))
                break

        # Detectar fecha
        date_patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})'
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                if '/' in pattern or '-' in pattern:
                    if len(match.group(3)) == 4:  # DD/MM/YYYY
                        day, month, year = match.groups()
                    else:  # YYYY-MM-DD
                        year, month, day = match.groups()

                    try:
                        date_obj = datetime(int(year), int(month), int(day))
                        data['fecha_recogida'] = date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        pass
                break

        return data

    def check_completion_status(self, session_id: str) -> Tuple[bool, List[str]]:
        """Verificar si se ha completado la recopilación de datos"""
        session = self.sessions.get(session_id, {})
        quotation_data = session.get('quotation_data', {})

        missing_fields = []
        for field in self.required_fields:
            if field not in quotation_data or not quotation_data[field]:
                missing_fields.append(field)

        is_complete = len(missing_fields) == 0
        return is_complete, missing_fields

    def generate_quotation(self, session_id: str) -> Optional[Dict]:
        """Generar cotización llamando al backend de Node.js"""
        logger.info(f"Iniciando generacion de cotizacion, session: {session_id}")

        session = self.sessions.get(session_id, {})
        quotation_data = session.get('quotation_data', {})

        logger.debug(f"Datos de cotizacion extraidos: {quotation_data}")

        try:
            # Transformar datos al formato del backend
            backend_payload = self._transform_to_backend_format(quotation_data)

            logger.debug(f"Enviando cotizacion al backend: {self.backend_url}/api/quotes/ai-generate")
            logger.debug(f"Payload: {json.dumps(backend_payload, ensure_ascii=False)}")

            # Llamar al backend
            headers = {
                'Content-Type': 'application/json'
            }

            if self.backend_auth_token:
                headers['Authorization'] = f'Bearer {self.backend_auth_token}'
                logger.debug("Usando token de autenticacion")

            logger.debug(f"POST request a: {self.backend_url}/api/quotes/ai-generate")

            response = requests.post(
                f'{self.backend_url}/api/quotes/ai-generate',
                json=backend_payload,
                headers=headers,
                timeout=60
            )

            logger.debug(f"Respuesta del backend - Status: {response.status_code}")
            logger.debug(f"Respuesta del backend - Body: {response.text[:500]}")

            if response.status_code == 200 or response.status_code == 201:
                quote_result = response.json()
                logger.info(f"Cotizacion generada exitosamente: {quote_result.get('quoteId', 'N/A')}")
                return quote_result
            else:
                logger.error(f"Error del backend: {response.status_code}")
                logger.error(f"Respuesta completa: {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error critico generando cotizacion: {e}")
            import traceback
            logger.error(traceback.format_exc())

        return None

    def _transform_to_backend_format(self, data: Dict) -> Dict:
        """Transformar datos de Claude al formato esperado por el backend"""
        # Convertir peso de kg a toneladas, con mínimo de 0.1t (100kg) para validación
        weight_tons = max(data.get('peso_kg', 1000) / 1000, 0.1)

        return {
            "route": {
                "origin": data.get('origen', ''),
                "destination": data.get('destino', '')
            },
            "cargo": {
                "type": data.get('tipo_carga', 'general'),
                "weight": weight_tons,
                "volume": data.get('volumen_m3', weight_tons * 1.5),  # Estimación si no hay volumen
                "value": data.get('valor_carga', 0),
                "description": data.get('descripcion_carga', f"Carga de tipo {data.get('tipo_carga', 'general')}")
            },
            "service": {
                "pickupDate": data.get('fecha_recogida', (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'))
            },
            "client": {
                "email": data.get('email_cliente', ''),
                "company": data.get('nombre_empresa', 'Cliente'),
                "contactName": data.get('nombre_cliente', data.get('nombre_empresa', 'Cliente')),
                "phone": data.get('telefono_cliente', '')
            },
            "preferences": {
                "serviceType": data.get('tipo_servicio', 'estandar'),
                "profitMargin": data.get('margen_utilidad', 15)
            },
            "requirements": {
                "insurance": data.get('requiere_seguro', True),
                "tracking": data.get('requiere_tracking', True),
                "signature": data.get('requiere_firma', False)
            },
            "metadata": {
                "source": "claude_ai_agent",
                "sessionId": data.get('session_id', 'unknown'),
                "conversational": True
            }
        }

    def _generate_simulated_quote(self, data: Dict) -> Dict:
        """Generar cotización simulada"""
        # Datos de ejemplo para simulación
        distance_map = {
            'francia': 800, 'alemania': 1200, 'italia': 1100,
            'países bajos': 1300, 'bélgica': 1000, 'suiza': 1000,
            'austria': 1400, 'portugal': 400, 'república checa': 1600,
            'polonia': 1800
        }

        destination = data.get('destino', '').lower()
        distance = 800  # Default

        for country, dist in distance_map.items():
            if any(city in destination.lower() for city in [country]):
                distance = dist
                break

        weight_kg = data.get('peso_kg', 1000)
        cargo_type = data.get('tipo_carga', 'carga_general')

        # Tarifas base
        base_rates = {
            'carga_general': 1.20,
            'carga_fragil': 1.80,
            'electronica': 2.10,
            'quimicos': 2.50,
            'alimentarios': 1.60,
            'refrigerado': 2.20,
            'peligrosa': 3.00
        }

        rate = base_rates.get(cargo_type, 1.20)
        transport_cost = (weight_kg * rate * distance) / 100
        fuel_cost = distance * 0.35
        insurance_cost = max(weight_kg * 0.05, 50)
        toll_cost = distance * 0.08

        total_cost = transport_cost + fuel_cost + insurance_cost + toll_cost

        quote_id = f"LUC1-{data.get('fecha_recogida', datetime.now().strftime('%Y%m%d')).replace('-', '')}-{int(weight_kg)}"

        return {
            'quote_id': quote_id,
            'origen': data.get('origen'),
            'destino': data.get('destino'),
            'peso_kg': weight_kg,
            'tipo_carga': cargo_type,
            'distancia_km': distance,
            'costo_total_eur': round(total_cost, 2),
            'tiempo_estimado_dias': max(1, round(distance / 400)),
            'fecha_recogida': data.get('fecha_recogida'),
            'fecha_generacion': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'generado_por': 'LUC1'
        }

    def _generate_and_open_html(self, quote: Dict, quote_id: str):
        """Generar HTML y abrir en navegador"""
        try:
            # Crear template HTML simple
            html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización {quote_id}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ background: #2c3e50; color: white; padding: 20px; margin: -30px -30px 30px -30px; border-radius: 10px 10px 0 0; }}
        .cost {{ font-size: 2em; color: #27ae60; font-weight: bold; }}
        .details {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }}
        .detail-box {{ background: #ecf0f1; padding: 15px; border-radius: 5px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 2px solid #3498db; text-align: center; color: #7f8c8d; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚚 Cotización de Transporte</h1>
            <p>Generada por LUC1 • ID: {quote_id}</p>
        </div>

        <div class="details">
            <div class="detail-box">
                <h3>📍 Origen</h3>
                <p>{quote.get('origen', 'N/A')}</p>
            </div>
            <div class="detail-box">
                <h3>🎯 Destino</h3>
                <p>{quote.get('destino', 'N/A')}</p>
            </div>
            <div class="detail-box">
                <h3>📦 Peso</h3>
                <p>{quote.get('peso_kg', 0)} kg</p>
            </div>
            <div class="detail-box">
                <h3>📊 Distancia</h3>
                <p>{quote.get('distancia_km', 0)} km</p>
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <h2>💰 Costo Total</h2>
            <div class="cost">{quote.get('costo_total_eur', 0)} EUR</div>
        </div>

        <div class="footer">
            <p>Cotización válida por 7 días • Generada: {quote.get('fecha_generacion', 'N/A')}</p>
            <p>🤖 Creada automáticamente por LUC1</p>
        </div>
    </div>
</body>
</html>
            """

            # Guardar HTML
            os.makedirs('./frontend/public/quotations', exist_ok=True)
            html_path = f'./frontend/public/quotations/{quote_id}.html'

            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            # Intentar abrir en navegador
            try:
                import subprocess
                subprocess.run(['xdg-open', f'http://localhost:3000/quotations/{quote_id}.html'], check=False)
            except:
                logger.info(f"Cotizacion HTML disponible en: http://localhost:3000/quotations/{quote_id}.html")

        except Exception as e:
            logger.warning(f"Error generando HTML: {e}")

    def generate_response(self, message: str, session_id: str = None) -> str:
        """Generar respuesta de LUC1"""
        self.cleanup_sessions()

        # Crear sesion si no existe
        if not session_id or session_id not in self.sessions:
            session_id = self.create_session(session_id)

        # Update last activity
        self.sessions[session_id]['last_activity'] = time.time()

        session = self.sessions[session_id]

        # Obtener el último mensaje del asistente para contexto
        last_assistant_message = ""
        if session['messages']:
            for msg in reversed(session['messages']):
                if msg['role'] == 'assistant':
                    last_assistant_message = msg['content']
                    break

        # Extraer datos de cotización del mensaje con contexto
        extracted_data = self.extract_quotation_data(message, last_assistant_message)

        logger.debug(f"Datos extraidos del mensaje: {extracted_data}")
        logger.debug(f"Contexto (ultima pregunta): {last_assistant_message[:100]}...")
        logger.debug(f"Datos en sesion ANTES de actualizar: {session['quotation_data']}")

        # Actualizar datos de la sesión
        session['quotation_data'].update(extracted_data)

        logger.debug(f"Datos en sesion DESPUES de actualizar: {session['quotation_data']}")

        # Agregar mensaje del usuario
        session['messages'].append({
            "role": "user",
            "content": message
        })

        # Verificar si está completa la información
        is_complete, missing_fields = self.check_completion_status(session_id)

        logger.debug(f"Estado de completitud: completo={is_complete}, faltantes={missing_fields}")

        if is_complete:
            # Generar cotización automáticamente
            quote = self.generate_quotation(session_id)
            if quote:
                quote_id = quote.get('quoteId', quote.get('quote_id', 'N/A'))
                portal_token = quote.get('portalAccess', {}).get('token', '')
                portal_url = quote.get('portalAccess', {}).get('accessUrl', '')
                email_template = quote.get('emailTemplate', {}).get('content', '')

                response = f"""✅ **Cotización generada y guardada exitosamente**

📋 **ID:** {quote_id}
🚛 **Ruta:** {quote.get('route', {}).get('origin', 'N/A')} → {quote.get('route', {}).get('destination', 'N/A')}
📏 **Distancia:** {quote.get('route', {}).get('distance', 0):.0f} km
💰 **Total:** {quote.get('costBreakdown', {}).get('total', 0):.2f} EUR

---

🔗 **PORTAL PARA EL CLIENTE:**
{portal_url}

📧 **EMAIL GENERADO:**
Se creó un template profesional listo para enviar al cliente.

📊 **Estado:** Guardado en sistema | Listo para enviar

¿Generar otra cotización?"""
            else:
                response = "Lo siento, hubo un problema generando la cotización. ¿Podrías verificar los datos proporcionados?"
        else:
            # Continuar conversación para recopilar datos faltantes
            # Crear mensaje de contexto con datos ya recopilados
            collected_data = session['quotation_data']
            context_parts = []

            if collected_data.get('origen'):
                context_parts.append(f"- Origen: {collected_data['origen']}")
            if collected_data.get('destino'):
                context_parts.append(f"- Destino: {collected_data['destino']}")
            if collected_data.get('peso_kg'):
                context_parts.append(f"- Peso: {collected_data['peso_kg']} kg")
            if collected_data.get('volumen_m3'):
                context_parts.append(f"- Volumen: {collected_data['volumen_m3']} m³")
            if collected_data.get('tipo_carga'):
                context_parts.append(f"- Tipo de carga: {collected_data['tipo_carga']}")
            if collected_data.get('fecha_recogida'):
                context_parts.append(f"- Fecha recogida: {collected_data['fecha_recogida']}")

            # Agregar mensaje de contexto al inicio si hay datos
            messages_with_context = []
            if context_parts:
                context_text = "DATOS YA RECOPILADOS:\n" + "\n".join(context_parts) + "\n\nNO vuelvas a preguntar por estos datos. Continúa con los campos faltantes."
                messages_with_context.append({
                    "role": "user",
                    "content": context_text
                })
                messages_with_context.append({
                    "role": "assistant",
                    "content": "Entendido, tengo estos datos. Continuaré preguntando solo por lo que falta."
                })

            # Agregar mensajes de la conversación
            messages_with_context.extend(session['messages'])

            # Select model based on message complexity
            model = self._select_model(message, session)

            # Llamar a Claude API con contexto
            response = self.call_claude_api(messages_with_context, session_id, model=model)

        # Agregar respuesta del asistente a la sesión
        session['messages'].append({
            "role": "assistant",
            "content": response
        })

        return response

    def load_model(self):
        """Simular carga del modelo (para compatibilidad)"""
        self.is_loaded = True
        logger.info("LUC1 con Claude Sonnet 4 cargado correctamente")

    def get_session_data(self, session_id: str) -> Dict:
        """Obtener datos de la sesión"""
        return self.sessions.get(session_id, {})

    def clear_session(self, session_id: str):
        """Limpiar datos de la sesión"""
        if session_id in self.sessions:
            del self.sessions[session_id]

    def analyze_direct(self, prompt: str, context: dict = None) -> str:
        """
        MODO AGENTE: Análisis directo sin conversación
        Usado para análisis de precios de transportistas desde luc1Service.js
        """
        try:
            logger.info("LUC1 MODO AGENTE - Analisis directo iniciado")

            # Crear prompt del sistema específico para análisis
            system_prompt = """Eres LUC1, un experto analista de logística europea especializado en evaluación de ofertas de transporte.

TU ROL:
Analizar ofertas de transportistas y datos de rutas para recomendar la mejor opción comercial para AXEL.

ANÁLISIS REQUERIDO:
1. Evaluar precios de transportistas considerando confiabilidad
2. Analizar restricciones europeas y su impacto en costos
3. Considerar datos de peajes y distancias reales
4. Recomendar transportista, precio base y margen comercial óptimo

FORMATO DE RESPUESTA OBLIGATORIO:
Debes terminar tu análisis con estas líneas exactas (reemplaza valores):

TRANSPORTISTA_RECOMENDADO: [nombre]
PRECIO_BASE_OPTIMO: €[cantidad]
MARGEN_SUGERIDO: [porcentaje]%
PRECIO_FINAL_CLIENTE: €[cantidad]
CONFIANZA_DECISION: [porcentaje]%
NIVEL_SERVICIO: [Económico/Estándar/Express]
RESTRICCIONES_IMPACTO: [Alto/Medio/Bajo]
ALERTAS_CRITICAS: [lista separada por comas o "Ninguna"]
RECOMENDACIONES_ESPECIALES: [acciones específicas o "Ninguna"]
JUSTIFICACION: [explicación breve]"""

            # Preparar request para Claude API
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }

            data = {
                "model": self.model,
                "max_tokens": 2000,
                "system": [
                    {
                        "type": "text",
                        "text": system_prompt,
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }

            # Llamar a Claude API con timeout extendido
            response = requests.post(
                self.api_url,
                headers=headers,
                json=data,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                analysis = result['content'][0]['text']
                logger.info(f"Analisis completado: {len(analysis)} caracteres")
                return analysis
            else:
                logger.error(f"Error en API Claude: {response.status_code}")
                logger.error(f"Response: {response.text}")
                raise Exception(f"Claude API error: {response.status_code}")

        except Exception as e:
            logger.error(f"Error en analisis directo: {e}")
            # Retornar análisis de fallback estructurado
            return """Análisis realizado con datos disponibles.

TRANSPORTISTA_RECOMENDADO: timocom
PRECIO_BASE_OPTIMO: €3200
MARGEN_SUGERIDO: 20%
PRECIO_FINAL_CLIENTE: €3840
CONFIANZA_DECISION: 75%
NIVEL_SERVICIO: Estándar
RESTRICCIONES_IMPACTO: Medio
ALERTAS_CRITICAS: Verificar disponibilidad de transportista
RECOMENDACIONES_ESPECIALES: Confirmar fechas con transportista
JUSTIFICACION: Análisis basado en promedio de mercado. Sistema de IA temporalmente no disponible."""