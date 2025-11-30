#!/usr/bin/env python3
"""
Servidor simple de LUCI con Ollama
Puerto: 8002
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import sys
import os

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.gemma_handler_sequential import GemmaHandler
from loguru import logger

app = FastAPI(title="LUCI AI Service - Ollama")

# Instancia global de LUCI
luci = None

class ChatRequest(BaseModel):
    message: str
    sessionId: str

class ChatResponse(BaseModel):
    success: bool
    response: str = None
    error: str = None

@app.on_event("startup")
async def startup_event():
    """Initialize LUCI with Ollama on server startup"""
    global luci
    logger.info("🚀 Starting LUCI AI Service with Ollama...")
    try:
        luci = GemmaHandler()
        luci.load_model()
        if luci.is_loaded:
            logger.success("✅ LUCI AI Service with Ollama started successfully")
        else:
            logger.error("❌ Failed to connect to Ollama")
    except Exception as e:
        logger.error(f"❌ Failed to start LUCI: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": luci.is_loaded if luci else False,
        "service": "LUCI AI with Ollama"
    }

@app.post("/chat/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    """Chat endpoint for LUCI"""
    try:
        if not luci or not luci.is_loaded:
            return ChatResponse(
                success=False,
                error="LUCI no está disponible en este momento."
            )

        # Generar respuesta con session ID
        response = luci.generate_response(request.message, request.sessionId)

        return ChatResponse(
            success=True,
            response=response
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            success=False,
            error="Error interno del servidor."
        )

if __name__ == "__main__":
    logger.info("🤖 Starting LUCI Simple Server on port 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002)