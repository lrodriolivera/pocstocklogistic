"""
LUCI AI Service - FastAPI Server
Main server for the logistics AI assistant
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import json
import asyncio
from loguru import logger
import uvicorn

from models.gemma_handler import get_luci_instance
from prompts.luci_prompts import LuciPrompts

# Initialize FastAPI app
app = FastAPI(
    title="LUCI AI Service",
    description="AI Assistant for Stock Logistic Solutions",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LUCI on startup
luci = None

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    user_name: Optional[str] = "Usuario"
    user_role: Optional[str] = "agente_comercial"
    context: Optional[Dict] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    suggestions: Optional[List[str]] = None

class QuoteAssistRequest(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    cargo_type: Optional[str] = None
    weight: Optional[float] = None
    user_name: str = "Usuario"
    session_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    timestamp: str
    version: str = "1.0.0"

# Session management
sessions = {}

class SessionManager:
    @staticmethod
    def get_or_create_session(session_id: Optional[str], user_id: str) -> str:
        """Get existing session or create new one"""
        if session_id and session_id in sessions:
            return session_id

        import uuid
        new_session_id = str(uuid.uuid4())
        sessions[new_session_id] = {
            "user_id": user_id,
            "created_at": datetime.now(),
            "messages": [],
            "context": {}
        }
        return new_session_id

    @staticmethod
    def add_message(session_id: str, role: str, content: str):
        """Add message to session history"""
        if session_id in sessions:
            sessions[session_id]["messages"].append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            # Keep only last 20 messages
            if len(sessions[session_id]["messages"]) > 20:
                sessions[session_id]["messages"] = sessions[session_id]["messages"][-20:]

    @staticmethod
    def get_context(session_id: str) -> str:
        """Get conversation context from session"""
        if session_id not in sessions:
            return ""

        messages = sessions[session_id]["messages"][-10:]  # Last 10 messages
        context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        return context

@app.on_event("startup")
async def startup_event():
    """Initialize LUCI model on server startup"""
    global luci
    logger.info("🚀 Starting LUCI AI Service...")
    try:
        luci = get_luci_instance()
        # Preload model in background
        asyncio.create_task(preload_model())
        logger.success("✅ LUCI AI Service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start LUCI: {e}")

async def preload_model():
    """Preload the model in background"""
    try:
        logger.info("Loading LUCI model in background...")
        luci.load_model()
        logger.success("Model preloaded successfully")
    except Exception as e:
        logger.error(f"Error preloading model: {e}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=luci.is_loaded if luci else False,
        timestamp=datetime.now().isoformat()
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint for LUCI"""
    try:
        # Get or create session
        session_id = SessionManager.get_or_create_session(
            request.session_id,
            request.user_id or "anonymous"
        )

        # Get conversation context
        context = SessionManager.get_context(session_id)

        # Get system prompt
        system_prompt = LuciPrompts.get_system_prompt(
            request.user_name,
            request.user_role
        )

        # Build full prompt with context
        full_prompt = request.message
        if context:
            full_prompt = f"Conversación previa:\n{context}\n\nUsuario: {request.message}"

        # Generate response
        response = luci.generate_response(
            prompt=full_prompt,
            system_prompt=system_prompt,
            temperature=0.7
        )

        # Save to session
        SessionManager.add_message(session_id, "user", request.message)
        SessionManager.add_message(session_id, "assistant", response)

        # Generate suggestions based on context
        suggestions = None
        if "cotización" in request.message.lower():
            suggestions = [
                "Ver cotizaciones anteriores",
                "Calcular nueva ruta",
                "Consultar tarifas"
            ]

        return ChatResponse(
            response=response,
            session_id=session_id,
            timestamp=datetime.now().isoformat(),
            suggestions=suggestions
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint for real-time responses"""
    try:
        session_id = SessionManager.get_or_create_session(
            request.session_id,
            request.user_id or "anonymous"
        )

        system_prompt = LuciPrompts.get_system_prompt(
            request.user_name,
            request.user_role
        )

        async def generate():
            """Generator for streaming response"""
            full_response = ""
            for token in luci.generate_streaming_response(
                prompt=request.message,
                system_prompt=system_prompt
            ):
                full_response += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            # Save complete response to session
            SessionManager.add_message(session_id, "user", request.message)
            SessionManager.add_message(session_id, "assistant", full_response)
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )

    except Exception as e:
        logger.error(f"Stream chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/greeting")
async def get_greeting(user_name: str = "Usuario", user_role: str = "agente_comercial"):
    """Get personalized greeting for user login"""
    try:
        # Determine time of day
        hour = datetime.now().hour
        if hour < 12:
            time_of_day = "morning"
        elif hour < 18:
            time_of_day = "afternoon"
        else:
            time_of_day = "evening"

        # Get greeting prompt
        greeting = LuciPrompts.get_greeting_prompt(
            user_name=user_name,
            time_of_day=time_of_day
        )

        # Generate personalized greeting using the model
        system_prompt = "Eres LUCI, asistente de logística. Saluda amigablemente y ofrece ayuda."
        response = luci.generate_response(
            prompt=f"Genera un saludo para {user_name}",
            system_prompt=system_prompt,
            temperature=0.9,
            max_length=150
        )

        return {
            "greeting": greeting,
            "ai_greeting": response,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        # Fallback greeting if model fails
        return {
            "greeting": f"¡Hola {user_name}! Soy LUC1, tu asistente de logística. ¿En qué puedo ayudarte?",
            "ai_greeting": None,
            "timestamp": datetime.now().isoformat()
        }

@app.post("/assist/quote")
async def assist_quote(request: QuoteAssistRequest):
    """Assist with quote generation"""
    try:
        # Get quote assistant prompt
        quote_data = {
            "origin": request.origin,
            "destination": request.destination,
            "cargo_type": request.cargo_type,
            "weight": request.weight
        }

        assistant_prompt = LuciPrompts.get_quote_assistant_prompt(quote_data)

        # Generate detailed assistance
        system_prompt = LuciPrompts.get_system_prompt(request.user_name)
        response = luci.generate_response(
            prompt=assistant_prompt,
            system_prompt=system_prompt,
            temperature=0.6
        )

        return {
            "assistance": response,
            "quote_data": quote_data,
            "complete": all([request.origin, request.destination, request.cargo_type, request.weight]),
            "session_id": request.session_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Quote assist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    session_id = SessionManager.get_or_create_session(None, user_id)

    try:
        # Send initial greeting
        greeting = LuciPrompts.get_greeting_prompt(
            user_name=user_id,
            time_of_day="morning"
        )
        await websocket.send_json({
            "type": "greeting",
            "message": greeting,
            "session_id": session_id
        })

        while True:
            # Receive message
            data = await websocket.receive_json()
            message = data.get("message", "")

            # Generate response
            system_prompt = LuciPrompts.get_system_prompt(user_id)

            # Stream response tokens
            full_response = ""
            for token in luci.generate_streaming_response(
                prompt=message,
                system_prompt=system_prompt
            ):
                full_response += token
                await websocket.send_json({
                    "type": "token",
                    "token": token
                })

            # Send completion
            await websocket.send_json({
                "type": "complete",
                "message": full_response,
                "session_id": session_id
            })

            # Save to session
            SessionManager.add_message(session_id, "user", message)
            SessionManager.add_message(session_id, "assistant", full_response)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()

@app.post("/validate")
async def validate_data(data_type: str, value: str):
    """Validate data using LUCI"""
    try:
        validation_prompt = LuciPrompts.get_validation_prompt(data_type, value)
        response = luci.generate_response(
            prompt=f"Valida este dato: {validation_prompt}",
            temperature=0.3,
            max_length=100
        )

        return {
            "valid": "✅" in response or "correcto" in response.lower(),
            "message": response,
            "value": value,
            "type": data_type
        }

    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {
            "valid": False,
            "message": "Error en validación",
            "value": value,
            "type": data_type
        }

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear a specific session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session cleared", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/model/status")
async def model_status():
    """Get model status and information"""
    return {
        "model_loaded": luci.is_loaded if luci else False,
        "model_name": luci.model_name if luci else None,
        "device": luci.device if luci else None,
        "sessions_active": len(sessions),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
        }
    )