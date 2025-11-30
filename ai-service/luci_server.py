#!/usr/bin/env python3
"""
Servidor LUC1 con Claude Sonnet 4 API
Puerto: 8002 (reemplaza el servicio anterior)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import sys
import os

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from claude_handler import LUC1ClaudeHandler

app = FastAPI(title="LUC1 AI Service - Claude Sonnet 4")

# Instancia global de LUC1
luc1 = None

class ChatRequest(BaseModel):
    message: str
    sessionId: str

class ChatResponse(BaseModel):
    success: bool
    response: str = None
    error: str = None
    sessionData: dict = None

class TransportistAnalysisRequest(BaseModel):
    prompt: str
    sessionId: str
    context: dict = None

@app.on_event("startup")
async def startup_event():
    """Initialize LUC1 with Claude Sonnet 4 on server startup"""
    global luc1
    print("🚀 Starting LUC1 AI Service with Claude Sonnet 4...")
    try:
        luc1 = LUC1ClaudeHandler()
        luc1.load_model()
        if luc1.is_loaded:
            print("✅ LUC1 AI Service with Claude Sonnet 4 started successfully")
        else:
            print("❌ Failed to initialize LUC1")
    except Exception as e:
        print(f"❌ Failed to start LUC1: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": luc1.is_loaded if luc1 else False,
        "service": "LUC1 AI with Claude Sonnet 4.5",
        "model": luc1.model if luc1 else "unknown"
    }

@app.post("/chat/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    """Chat endpoint for LUC1"""
    try:
        if not luc1 or not luc1.is_loaded:
            return ChatResponse(
                success=False,
                error="LUC1 no está disponible en este momento."
            )

        # Generar respuesta con session ID (puede crear uno nuevo si no existe)
        response = luc1.generate_response(request.message, request.sessionId)

        # Obtener la sesión actual (con el sessionId correcto)
        actual_session_id = luc1.current_session
        session_data = luc1.get_session_data(actual_session_id)

        # Agregar session_id explícitamente a sessionData
        if session_data:
            session_data['session_id'] = actual_session_id

        return ChatResponse(
            success=True,
            response=response,
            sessionData=session_data
        )

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return ChatResponse(
            success=False,
            error="Error interno del servidor."
        )

@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session data"""
    if not luc1:
        raise HTTPException(status_code=503, detail="LUC1 no disponible")

    session_data = luc1.get_session_data(session_id)
    return {
        "success": True,
        "sessionData": session_data
    }

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear session data"""
    if not luc1:
        raise HTTPException(status_code=503, detail="LUC1 no disponible")

    luc1.clear_session(session_id)
    return {
        "success": True,
        "message": "Sesión limpiada correctamente"
    }

@app.post("/greeting")
async def get_greeting(user_name: str = "Usuario", user_role: str = "agente_comercial"):
    """Get personalized greeting for user"""
    try:
        from datetime import datetime
        hour = datetime.now().hour
        time_greeting = "Buenos días" if hour < 12 else "Buenas tardes" if hour < 18 else "Buenas noches"

        # Greeting específico para ejecutivo comercial
        greeting_message = f"{time_greeting} {user_name}! Soy LUC1, tu asistente para cotizaciones. ¿Qué envío necesitas cotizar?"

        return {
            "greeting": greeting_message,
            "ai_greeting": greeting_message,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error in greeting: {e}")
        return {
            "greeting": f"Hola {user_name}! Soy LUC1. ¿En qué puedo ayudarte?",
            "ai_greeting": None,
            "timestamp": datetime.now().isoformat()
        }

@app.post("/analyze/transportist-prices")
async def analyze_transportist_prices(request: TransportistAnalysisRequest):
    """Endpoint específico para análisis de precios de transportistas - MODO AGENTE"""
    try:
        if not luc1 or not luc1.is_loaded:
            raise HTTPException(status_code=503, detail="LUC1 no disponible")

        print(f"🤖 MODO AGENTE: Analizando precios de transportistas")
        print(f"   Session ID: {request.sessionId}")
        print(f"   Context keys: {list(request.context.keys()) if request.context else 'None'}")

        # Usar análisis directo (modo agente) - SIN conversación
        analysis_response = luc1.analyze_direct(request.prompt, request.context)

        print(f"✅ Análisis completado en modo agente")

        return {
            "success": True,
            "analysis": analysis_response,
            "sessionId": request.sessionId,
            "context": request.context,
            "mode": "agent"
        }

    except Exception as e:
        print(f"❌ Error en análisis de transportistas: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analizando precios: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "LUC1 AI Service",
        "model": "Claude Sonnet 4",
        "status": "running",
        "backend_url": os.getenv("BACKEND_URL", "http://localhost:5000"),
        "description": "Asistente inteligente para cotizaciones de logística europea"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8002))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🤖 Starting LUC1 Server with Claude Sonnet 4 on port {port}...")
    uvicorn.run(app, host=host, port=port)