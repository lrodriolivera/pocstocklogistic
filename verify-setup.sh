#!/bin/bash

echo "🔍 Verificando configuración AXEL..."

# Verificar estructura
echo "📁 Verificando estructura de directorios..."
if [ -d "backend/src" ] && [ -d "frontend/src" ]; then
    echo "✅ Estructura de directorios correcta"
else
    echo "❌ Estructura de directorios incorrecta"
    exit 1
fi

# Verificar archivos clave
echo "📄 Verificando archivos clave..."
KEY_FILES=("backend/package.json" "frontend/package.json" "backend/.env.example" "frontend/.env.example")
for file in "${KEY_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file falta"
        exit 1
    fi
done

# Verificar dependencias
echo "📦 Verificando dependencias..."
if [ -d "backend/node_modules" ] && [ -d "frontend/node_modules" ]; then
    echo "✅ Dependencias instaladas"
else
    echo "❌ Dependencias faltantes"
    exit 1
fi

echo ""
echo "🎉 ¡Configuración verificada exitosamente!"
echo "📖 Ejecuta './start-dev.sh' para iniciar el entorno de desarrollo"
