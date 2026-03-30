#!/bin/bash

# Script para iniciar el entorno de desarrollo completo

echo "🚀 Iniciando AXEL Development Environment..."

# Función para cleanup en exit
cleanup() {
    echo "🛑 Deteniendo servicios..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup EXIT

# Iniciar backend
echo "📡 Iniciando Backend en puerto 5000..."
cd backend && npm run dev &
BACKEND_PID=$!

# Esperar un poco para que el backend inicie
sleep 3

# Iniciar frontend
echo "⚛️ Iniciando Frontend en puerto 3001..."
cd ./frontend && npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Servicios iniciados:"
echo "   📡 Backend:  http://localhost:5000"
echo "   ⚛️ Frontend: http://localhost:3000"
echo "   🏥 Health:   http://localhost:5000/health"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar indefinidamente
wait
