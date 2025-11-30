#!/bin/bash

# LUCI AI Service Startup Script

echo "🤖 Iniciando LUCI (LUC1) - Asistente Logístico IA"
echo "=================================="

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no está instalado"
    exit 1
fi

# Verificar versión de Python (requiere 3.9+)
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
required_version="3.9"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Se requiere Python 3.9 o superior. Versión actual: $python_version"
    exit 1
fi

echo "✅ Python $python_version detectado"

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
echo "🔄 Activando entorno virtual..."
source venv/bin/activate

# Verificar e instalar dependencias
echo "📋 Verificando dependencias..."
if [ ! -f "requirements_installed.flag" ]; then
    echo "⬇️  Instalando dependencias de LUCI..."
    pip install --upgrade pip
    pip install -r requirements.txt

    if [ $? -eq 0 ]; then
        touch requirements_installed.flag
        echo "✅ Dependencias instaladas correctamente"
    else
        echo "❌ Error instalando dependencias"
        exit 1
    fi
else
    echo "✅ Dependencias ya instaladas"
fi

# Verificar espacio en disco para el modelo (mínimo 3GB)
available_space=$(df . | tail -1 | awk '{print $4}')
required_space=3000000  # 3GB en KB

if [ "$available_space" -lt "$required_space" ]; then
    echo "⚠️  Advertencia: Espacio en disco bajo. Se requieren al menos 3GB libres"
    echo "📊 Espacio disponible: $(($available_space / 1024 / 1024))GB"
fi

# Crear directorio de caché si no existe
if [ ! -d "cache" ]; then
    echo "📁 Creando directorio de caché..."
    mkdir -p cache
fi

# Copiar .env.example a .env si no existe
if [ ! -f ".env" ]; then
    echo "⚙️  Copiando configuración de ejemplo..."
    cp .env.example .env
    echo "📝 Edita el archivo .env para personalizar la configuración"
fi

# Verificar recursos del sistema
echo "🖥️  Verificando recursos del sistema..."
total_ram=$(free -m | awk 'NR==2{printf "%.1f", $2/1024}')
echo "💾 RAM disponible: ${total_ram}GB"

if (( $(echo "$total_ram < 2.0" | bc -l) )); then
    echo "⚠️  Advertencia: RAM baja. Se recomienda al menos 4GB para un rendimiento óptimo"
fi

# Detectar GPU (opcional)
if command -v nvidia-smi &> /dev/null; then
    gpu_info=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits | head -n1)
    echo "🎮 GPU detectada: $gpu_info"
else
    echo "🖥️  Ejecutando en modo CPU (sin GPU)"
fi

echo ""
echo "🚀 Iniciando LUCI AI Service..."
echo "🌐 El servicio estará disponible en: http://localhost:8001"
echo "📖 Documentación API: http://localhost:8001/docs"
echo ""
echo "💡 Consejo: La primera ejecución puede tardar varios minutos"
echo "    mientras se descarga el modelo Gemma 3-1B (~1.5GB)"
echo ""

# Iniciar el servidor
python main.py

echo ""
echo "👋 LUCI AI Service detenido"