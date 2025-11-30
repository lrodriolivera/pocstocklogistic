#!/usr/bin/env python3
"""
Test simple de LUCI con Ollama
"""

import sys
import os

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.gemma_handler import GemmaHandler
from loguru import logger

def test_luci():
    """Probar LUCI con Ollama"""
    logger.info("🤖 Iniciando prueba de LUCI con Ollama...")

    # Crear instancia de LUCI
    luci = GemmaHandler()

    # Cargar el modelo (conectar a Ollama)
    luci.load_model()

    if luci.is_loaded:
        logger.success("✅ LUCI conectado exitosamente a Ollama")

        # Probar una respuesta
        test_prompt = "Hola LUC1, necesito generar una cotización"
        logger.info(f"📝 Enviando prompt: {test_prompt}")

        response = luci.generate_response(test_prompt)
        logger.info(f"🤖 Respuesta de LUC1: {response}")

    else:
        logger.error("❌ No se pudo conectar a Ollama")

if __name__ == "__main__":
    test_luci()