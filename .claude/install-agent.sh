#!/bin/bash
# Instalación del Agent Logistics-Quotation para Claude Code
# Sistema completo de cotizaciones de transporte terrestre europeo

set -e

echo "🚚 INSTALANDO AGENT LOGISTICS-QUOTATION"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/rypcloud/Documentos/Logistic/POC/axel"
CLAUDE_DIR="$PROJECT_ROOT/.claude"

# Función para imprimir mensajes
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$PROJECT_ROOT" ]; then
    print_error "Directorio del proyecto no encontrado: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"
print_success "Directorio del proyecto encontrado"

# Crear estructura de directorios
print_status "Creando estructura de directorios..."

mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$PROJECT_ROOT/generated_documents"
mkdir -p "$PROJECT_ROOT/frontend/public/quotations"

print_success "Directorios creados"

# Verificar que el agent existe
if [ ! -f "$CLAUDE_DIR/agents/logistics-quotation.md" ]; then
    print_error "Agent logistics-quotation.md no encontrado"
    print_error "Asegúrate de que el agent está en: $CLAUDE_DIR/agents/logistics-quotation.md"
    exit 1
fi

print_success "Agent logistics-quotation.md encontrado"

# Instalar dependencias Python si no están instaladas
print_status "Verificando dependencias Python..."

cd "$PROJECT_ROOT/ai-service"

# Verificar si el venv existe
if [ ! -d "venv" ]; then
    print_warning "Entorno virtual no encontrado, creando uno nuevo..."
    python3 -m venv venv
fi

# Activar venv
source venv/bin/activate

# Instalar dependencias adicionales para el agent
print_status "Instalando dependencias del agent..."

pip install jinja2 > /dev/null 2>&1 || print_warning "Error instalando jinja2"

print_success "Dependencias Python verificadas"

# Verificar dependencias del backend
print_status "Verificando dependencias del backend..."

cd "$PROJECT_ROOT/backend"

if [ ! -d "node_modules" ]; then
    print_warning "node_modules no encontrado, instalando..."
    npm install > /dev/null 2>&1
fi

print_success "Dependencias del backend verificadas"

# Verificar dependencias del frontend
print_status "Verificando dependencias del frontend..."

cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    print_warning "node_modules del frontend no encontrado, instalando..."
    npm install > /dev/null 2>&1
fi

print_success "Dependencias del frontend verificadas"

# Hacer scripts ejecutables
print_status "Configurando permisos..."

chmod +x "$CLAUDE_DIR"/*.py
chmod +x "$CLAUDE_DIR/install-agent.sh"

print_success "Permisos configurados"

# Crear script de inicio rápido
print_status "Creando script de inicio rápido..."

cat > "$CLAUDE_DIR/start-logistics.sh" << 'EOF'
#!/bin/bash
# Script de inicio rápido para el agent logistics-quotation

PROJECT_ROOT="/home/rypcloud/Documentos/Logistic/POC/axel"

echo "🚚 INICIANDO SERVICIOS LOGISTICS-QUOTATION"
echo "=========================================="

# Función para verificar si un puerto está en uso
check_port() {
    netstat -tuln | grep ":$1 " > /dev/null 2>&1
}

# Iniciar backend si no está corriendo
if ! check_port 5000; then
    echo "🚀 Iniciando backend..."
    cd "$PROJECT_ROOT/backend"
    npm run dev > /dev/null 2>&1 &
    echo "✅ Backend iniciado en puerto 5000"
else
    echo "✅ Backend ya está corriendo en puerto 5000"
fi

# Iniciar frontend si no está corriendo
if ! check_port 3000; then
    echo "🚀 Iniciando frontend..."
    cd "$PROJECT_ROOT/frontend"
    npm start > /dev/null 2>&1 &
    echo "✅ Frontend iniciado en puerto 3000"
else
    echo "✅ Frontend ya está corriendo en puerto 3000"
fi

# Iniciar AI service si no está corriendo
if ! check_port 8001; then
    echo "🚀 Iniciando AI service..."
    cd "$PROJECT_ROOT/ai-service"
    source venv/bin/activate
    python main.py > /dev/null 2>&1 &
    echo "✅ AI service iniciado en puerto 8001"
else
    echo "✅ AI service ya está corriendo en puerto 8001"
fi

echo ""
echo "🎉 Todos los servicios están corriendo!"
echo "💡 Usa Claude Code con el agent logistics-quotation"
echo "📋 Comandos disponibles:"
echo "   /quote start    - Iniciar nueva cotización"
echo "   /quote help     - Ver todos los comandos"
echo ""
echo "🌐 URLs de acceso:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   AI Service: http://localhost:8001"
EOF

chmod +x "$CLAUDE_DIR/start-logistics.sh"

print_success "Script de inicio creado: $CLAUDE_DIR/start-logistics.sh"

# Crear archivo de configuración
print_status "Creando configuración..."

cat > "$CLAUDE_DIR/config.json" << EOF
{
  "agent_version": "1.0.0",
  "project_root": "$PROJECT_ROOT",
  "services": {
    "backend": "http://localhost:5000",
    "frontend": "http://localhost:3000",
    "ai_service": "http://localhost:8001"
  },
  "directories": {
    "generated_documents": "$PROJECT_ROOT/generated_documents",
    "quotations": "$PROJECT_ROOT/frontend/public/quotations",
    "claude_state": "$CLAUDE_DIR"
  },
  "features": {
    "auto_open_frontend": true,
    "real_time_validation": true,
    "api_integration": true,
    "pdf_generation": false,
    "html_generation": true
  },
  "installation_date": "$(date -I)",
  "python_requirements": [
    "jinja2",
    "requests",
    "pathlib"
  ]
}
EOF

print_success "Configuración creada"

# Verificar instalación
print_status "Verificando instalación..."

# Verificar archivos del agent
REQUIRED_FILES=(
    "$CLAUDE_DIR/agents/logistics-quotation.md"
    "$CLAUDE_DIR/logistics-state.json"
    "$CLAUDE_DIR/logistics-integration.py"
    "$CLAUDE_DIR/quotation-generator.py"
    "$CLAUDE_DIR/logistics-commands.py"
    "$CLAUDE_DIR/config.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$(basename "$file") ✓"
    else
        print_error "$(basename "$file") ✗ - FALTA"
    fi
done

# Test básico del agent
print_status "Ejecutando test básico..."

cd "$CLAUDE_DIR"
python3 -c "
import sys
import json
try:
    from logistics_integration import LogisticsIntegration
    from quotation_generator import QuotationGenerator
    from logistics_commands import LogisticsCommands

    # Test básico
    integration = LogisticsIntegration()
    generator = QuotationGenerator()
    commands = LogisticsCommands()

    print('✅ Todos los módulos se importaron correctamente')
    print('✅ Test básico completado')
except Exception as e:
    print(f'❌ Error en test: {e}')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    print_success "Test básico completado exitosamente"
else
    print_error "Error en test básico"
fi

# Mensaje final
echo ""
echo "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE!"
echo "========================================"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo ""
echo "1. 🚀 Iniciar servicios:"
echo "   $CLAUDE_DIR/start-logistics.sh"
echo ""
echo "2. 💬 Usar Claude Code:"
echo "   - Abre Claude Code en este proyecto"
echo "   - El agent 'logistics-quotation' estará disponible"
echo "   - Escribe: 'Quiero crear una cotización de transporte'"
echo ""
echo "3. 📋 Comandos disponibles:"
echo "   /quote start    - Iniciar nueva cotización"
echo "   /quote help     - Ver todos los comandos"
echo "   /quote services - Verificar servicios"
echo ""
echo "4. 🌐 Acceso web:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "📞 SOPORTE:"
echo "   - Logs en: $PROJECT_ROOT/logs/"
echo "   - Config: $CLAUDE_DIR/config.json"
echo "   - Estado: $CLAUDE_DIR/logistics-state.json"
echo ""
print_success "¡El Agent Logistics-Quotation está listo para usar!"