"""
LUCI Prompts - Sistema de prompts especializados para el asistente logístico
"""

from typing import Dict, Optional
from datetime import datetime

class LuciPrompts:
    """Manager de prompts para LUCI"""

    @staticmethod
    def get_system_prompt(user_name: str = "", user_role: str = "") -> str:
        """Obtiene el prompt del sistema para LUCI"""
        return f"""Eres LUCI (se escribe LUC1), un asistente inteligente especializado en logística y transporte internacional para AXEL.

Tu misión es ayudar a los agentes comerciales a generar cotizaciones precisas y gestionar sus operaciones logísticas.

INFORMACIÓN CLAVE:
- Tu nombre es LUCI pero se muestra como LUC1
- Trabajas para AXEL
- Eres experto en rutas europeas y transporte internacional
- Conoces regulaciones ADR, temperatura controlada y cargas especiales
- Usas € (euros) como moneda principal
- Hablas español de forma profesional pero amigable

CAPACIDADES:
1. Ayudar a generar cotizaciones de transporte
2. Calcular estimaciones de precio y tiempo
3. Sugerir rutas optimizadas
4. Validar información de carga
5. Explicar regulaciones y restricciones
6. Asistir con documentación necesaria

FORMATO DE RESPUESTA:
- Sé conciso pero completo
- Usa bullet points cuando sea útil
- Incluye estimaciones cuando sea posible
- Sugiere siguientes pasos
- Siempre ofrece ayuda adicional

Usuario actual: {user_name if user_name else "Agente Comercial"}
Rol: {user_role if user_role else "agente_comercial"}
Fecha: {datetime.now().strftime("%d/%m/%Y")}"""

    @staticmethod
    def get_greeting_prompt(user_name: str, time_of_day: str, last_activity: Optional[str] = None) -> str:
        """Genera un saludo personalizado"""
        greeting_time = {
            "morning": "Buenos días",
            "afternoon": "Buenas tardes",
            "evening": "Buenas noches"
        }.get(time_of_day, "Hola")

        base_greeting = f"{greeting_time} {user_name}! 👋"

        if last_activity:
            return f"""{base_greeting}

Veo que tu última actividad fue: {last_activity}.
¿Te gustaría continuar con eso o necesitas ayuda con algo nuevo?

Recuerda que puedo ayudarte con:
• 📦 Generar nuevas cotizaciones
• 🚚 Calcular rutas y tiempos
• 📊 Revisar cotizaciones anteriores
• 📋 Preparar documentación

¿En qué puedo asistirte hoy?"""
        else:
            return f"""{base_greeting}

Soy LUC1, tu asistente inteligente de logística. Estoy aquí para ayudarte a:
• 📦 Generar cotizaciones precisas
• 🚚 Optimizar rutas de transporte
• 📊 Gestionar tus operaciones
• 📋 Preparar documentación

¿Qué necesitas hacer hoy?"""

    @staticmethod
    def get_quote_assistant_prompt(quote_data: Dict) -> str:
        """Prompt para asistir en la generación de cotizaciones"""
        origin = quote_data.get('origin', '')
        destination = quote_data.get('destination', '')
        cargo_type = quote_data.get('cargo_type', '')
        weight = quote_data.get('weight', 0)

        missing_fields = []
        if not origin:
            missing_fields.append("origen")
        if not destination:
            missing_fields.append("destino")
        if not cargo_type:
            missing_fields.append("tipo de carga")
        if not weight:
            missing_fields.append("peso")

        if missing_fields:
            return f"""Para generar tu cotización, necesito algunos datos más:

{f'❓ Falta: {", ".join(missing_fields)}' if missing_fields else ''}

Por favor, proporciona:
{f'• Ciudad de origen' if not origin else f'✅ Origen: {origin}'}
{f'• Ciudad de destino' if not destination else f'✅ Destino: {destination}'}
{f'• Tipo de carga (general, ADR, refrigerada, etc.)' if not cargo_type else f'✅ Tipo: {cargo_type}'}
{f'• Peso en toneladas o kg' if not weight else f'✅ Peso: {weight}'}

¿Puedes completar esta información?"""
        else:
            return f"""Perfecto! Tengo todos los datos necesarios:

✅ Ruta: {origin} → {destination}
✅ Tipo de carga: {cargo_type}
✅ Peso: {weight}

Basándome en esta información:
• 📏 Distancia estimada: [calcularé la distancia]
• ⏱️ Tiempo de tránsito: 2-4 días (estimado)
• 💰 Rango de precio: €800-1,500 (estimado)

¿Deseas que genere la cotización completa o necesitas ajustar algún parámetro?

Opciones adicionales disponibles:
• Servicio express (entrega rápida)
• Seguro de carga
• Seguimiento en tiempo real
• Requisitos especiales (temperatura, ADR, etc.)"""

    @staticmethod
    def get_route_optimization_prompt(origin: str, destination: str) -> str:
        """Prompt para optimización de rutas"""
        return f"""Analizando ruta: {origin} → {destination}

Consideraciones importantes:
• 🛣️ Autopistas principales disponibles
• 🚫 Restricciones para camiones pesados
• 📍 Puntos de descanso obligatorios
• ⛽ Estaciones de servicio recomendadas
• 🌡️ Condiciones climáticas actuales

Recomendaciones:
1. Ruta principal via autopistas toll
2. Ruta alternativa economica
3. Consideraciones especiales para la carga

¿Necesitas información adicional sobre alguna ruta específica?"""

    @staticmethod
    def get_validation_prompt(data_type: str, value: str) -> str:
        """Prompt para validación de datos"""
        validations = {
            "email": f"Validando email: {value}\n✅ Formato correcto" if "@" in value else f"❌ Email inválido: {value}",
            "phone": f"Validando teléfono: {value}\n✅ Formato correcto" if len(value) > 8 else f"❌ Teléfono inválido: {value}",
            "weight": f"Peso {value} - ✅ Dentro de límites normales" if float(value.replace('kg', '').replace('t', '')) > 0 else f"❌ Peso inválido",
            "date": f"Fecha {value} - ✅ Válida para programación" if value else f"❌ Fecha requerida"
        }
        return validations.get(data_type, f"Validando {data_type}: {value}")

    @staticmethod
    def get_error_recovery_prompt(error_type: str) -> str:
        """Prompt para recuperación de errores"""
        error_messages = {
            "network": "Parece que hay un problema de conexión. ¿Puedo guardar tu información y reintentar en unos momentos?",
            "validation": "Hay algunos datos que necesito verificar. ¿Podríamos revisar la información paso a paso?",
            "calculation": "Necesito recalcular algunos valores. Dame un momento para obtener la información más precisa.",
            "default": "Ha ocurrido un pequeño inconveniente. ¿Podríamos intentarlo de nuevo?"
        }
        return error_messages.get(error_type, error_messages["default"])

    @staticmethod
    def get_quote_status_prompt(status: str, quote_id: str) -> str:
        """Prompt para informar estado de cotización"""
        status_messages = {
            "pending": f"📋 Cotización {quote_id} está pendiente de revisión",
            "in_progress": f"⏳ Cotización {quote_id} en proceso de generación",
            "completed": f"✅ Cotización {quote_id} completada y lista para enviar",
            "sent": f"📧 Cotización {quote_id} enviada al cliente",
            "accepted": f"🎉 ¡Excelente! Cotización {quote_id} aceptada por el cliente",
            "rejected": f"❌ Cotización {quote_id} rechazada. ¿Quieres crear una alternativa?"
        }
        return status_messages.get(status, f"Estado de cotización {quote_id}: {status}")

    @staticmethod
    def get_suggestion_prompt(context: str) -> str:
        """Prompt para sugerencias proactivas"""
        suggestions = {
            "new_quote": """Veo que no tienes cotizaciones pendientes. ¿Te gustaría:
• Crear una nueva cotización
• Revisar cotizaciones anteriores
• Ver estadísticas del día""",

            "incomplete_quote": """Tienes una cotización sin completar. ¿Quieres:
• Continuar con ella
• Guardarla como borrador
• Comenzar una nueva""",

            "peak_hours": """Es hora pico de consultas. Te sugiero:
• Preparar plantillas de cotización rápida
• Revisar tarifas actualizadas
• Verificar disponibilidad de rutas""",

            "end_of_day": """Se acerca el fin de la jornada. Recuerda:
• Enviar cotizaciones pendientes
• Hacer seguimiento a clientes
• Preparar agenda de mañana"""
        }
        return suggestions.get(context, "¿En qué más puedo ayudarte?")

# Función helper para formatear respuestas
def format_luci_response(message: str, include_signature: bool = True) -> str:
    """Formatea respuesta con la firma de LUCI"""
    if include_signature:
        return f"{message}\n\n— LUC1 🤖"
    return message