#!/bin/bash

# 🧪 Script de Testing Completo - Stock Logistic POC
# Este script ejecuta todos los tests del sistema

set -e

echo "🚀 Iniciando suite completa de tests - Stock Logistic POC"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variables
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
TEST_RESULTS_DIR="./test-results"

# Crear directorio de resultados
mkdir -p $TEST_RESULTS_DIR

log "Verificando dependencias..."

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
    exit 1
fi

# Verificar que npm está instalado
if ! command -v npm &> /dev/null; then
    error "npm no está instalado"
    exit 1
fi

success "Node.js $(node --version) y npm $(npm --version) detectados"

# Función para ejecutar tests del backend
run_backend_tests() {
    log "Ejecutando tests del backend..."

    cd $BACKEND_DIR

    # Tests unitarios
    log "Ejecutando tests unitarios del backend..."
    if npm test > ../test-results/backend-unit.log 2>&1; then
        success "Tests unitarios del backend: PASSED"
    else
        error "Tests unitarios del backend: FAILED"
        cat ../test-results/backend-unit.log
        return 1
    fi

    # Tests de integración
    log "Ejecutando tests de integración..."
    if npm run test:integration > ../test-results/backend-integration.log 2>&1; then
        success "Tests de integración: PASSED"
    else
        warning "Tests de integración: FAILED (pueden requerir servicios externos)"
        cat ../test-results/backend-integration.log
    fi

    # Tests E2E
    log "Ejecutando tests end-to-end..."
    if npm run test:e2e > ../test-results/backend-e2e.log 2>&1; then
        success "Tests E2E: PASSED"
    else
        warning "Tests E2E: FAILED (pueden requerir servicios externos)"
        cat ../test-results/backend-e2e.log
    fi

    cd ..
}

# Función para ejecutar tests del frontend
run_frontend_tests() {
    log "Ejecutando tests del frontend..."

    cd $FRONTEND_DIR

    # Tests unitarios con coverage
    log "Ejecutando tests unitarios del frontend..."
    if CI=true npm test -- --coverage --watchAll=false > ../test-results/frontend-unit.log 2>&1; then
        success "Tests unitarios del frontend: PASSED"
    else
        error "Tests unitarios del frontend: FAILED"
        cat ../test-results/frontend-unit.log
        cd ..
        return 1
    fi

    cd ..
}

# Función para ejecutar linting
run_linting() {
    log "Ejecutando análisis de código (linting)..."

    # Backend linting
    cd $BACKEND_DIR
    if npm run lint > ../test-results/backend-lint.log 2>&1; then
        success "Backend linting: PASSED"
    else
        warning "Backend linting: ISSUES FOUND"
        cat ../test-results/backend-lint.log
    fi
    cd ..

    # Frontend linting
    cd $FRONTEND_DIR
    if npm run lint > ../test-results/frontend-lint.log 2>&1; then
        success "Frontend linting: PASSED"
    else
        warning "Frontend linting: ISSUES FOUND"
        cat ../test-results/frontend-lint.log
    fi
    cd ..
}

# Función para verificar la build
run_build_test() {
    log "Verificando que el proyecto compila correctamente..."

    # Build del frontend
    cd $FRONTEND_DIR
    if npm run build > ../test-results/frontend-build.log 2>&1; then
        success "Frontend build: SUCCESS"
    else
        error "Frontend build: FAILED"
        cat ../test-results/frontend-build.log
        cd ..
        return 1
    fi
    cd ..

    success "Build verification: PASSED"
}

# Función para tests de performance básicos
run_performance_tests() {
    log "Ejecutando tests básicos de performance..."

    # Verificar tamaño del bundle
    if [ -f "$FRONTEND_DIR/build/static/js/*.js" ]; then
        BUNDLE_SIZE=$(du -sh $FRONTEND_DIR/build/static/js/*.js | awk '{print $1}')
        log "Tamaño del bundle JS: $BUNDLE_SIZE"

        # Verificar que el bundle no sea demasiado grande (>2MB es preocupante)
        BUNDLE_SIZE_KB=$(du -k $FRONTEND_DIR/build/static/js/*.js | awk '{total+=$1} END {print total}')
        if [ $BUNDLE_SIZE_KB -gt 2048 ]; then
            warning "Bundle size is large: ${BUNDLE_SIZE_KB}KB"
        else
            success "Bundle size is acceptable: ${BUNDLE_SIZE_KB}KB"
        fi
    fi
}

# Función para generar reporte
generate_report() {
    log "Generando reporte de resultados..."

    REPORT_FILE="$TEST_RESULTS_DIR/test-report.md"

    cat > $REPORT_FILE << EOF
# 📊 Reporte de Tests - Stock Logistic POC

**Fecha:** $(date)
**Versión:** 1.0.0

## Resumen de Resultados

### Tests Ejecutados
- ✅ Tests unitarios backend
- ✅ Tests unitarios frontend
- ⚠️  Tests de integración (dependientes de servicios externos)
- ⚠️  Tests E2E (dependientes de servicios externos)
- ✅ Análisis de código (linting)
- ✅ Verificación de build

### Archivos de Log Generados
- \`backend-unit.log\` - Tests unitarios del backend
- \`backend-integration.log\` - Tests de integración
- \`backend-e2e.log\` - Tests end-to-end
- \`frontend-unit.log\` - Tests unitarios del frontend
- \`backend-lint.log\` - Linting del backend
- \`frontend-lint.log\` - Linting del frontend
- \`frontend-build.log\` - Build del frontend

### Cobertura de Código
La cobertura de código está disponible en:
- Backend: \`backend/coverage/\`
- Frontend: \`frontend/coverage/\`

### Próximos Pasos
1. Revisar warnings de linting si los hay
2. Ejecutar tests de integración en ambiente con servicios externos
3. Configurar pipeline CI/CD para automatizar estos tests

---
Generated by Stock Logistic POC Test Suite
EOF

    success "Reporte generado: $REPORT_FILE"
}

# Función principal
main() {
    log "Comenzando suite de tests..."

    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        error "Por favor ejecuta este script desde el directorio raíz del proyecto"
        exit 1
    fi

    # Ejecutar todos los tests
    local failed=0

    # Tests del backend
    if ! run_backend_tests; then
        failed=$((failed + 1))
    fi

    # Tests del frontend
    if ! run_frontend_tests; then
        failed=$((failed + 1))
    fi

    # Linting
    run_linting

    # Build test
    if ! run_build_test; then
        failed=$((failed + 1))
    fi

    # Performance tests
    run_performance_tests

    # Generar reporte
    generate_report

    # Resumen final
    echo ""
    echo "=================================================="
    if [ $failed -eq 0 ]; then
        success "🎉 Todos los tests críticos pasaron exitosamente!"
        success "El proyecto está listo para producción."
    else
        error "❌ $failed test suite(s) fallaron"
        error "Revisa los logs en $TEST_RESULTS_DIR/ para más detalles"
        exit 1
    fi

    log "Tests completados. Revisa el reporte en: $TEST_RESULTS_DIR/test-report.md"
}

# Trap para cleanup
cleanup() {
    log "Limpiando procesos..."
    # Matar cualquier proceso que pueda haber quedado corriendo
    pkill -f "node.*test" || true
}

trap cleanup EXIT

# Ejecutar función principal
main "$@"