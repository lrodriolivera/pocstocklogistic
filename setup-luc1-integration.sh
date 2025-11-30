#!/bin/bash

# 🤖 PROMPT #2: Integración LUC1-COMEX para Stock Logistic POC
# Implementación de servicios de IA y análisis inteligente
# Duración: 6-8 horas automatizado en 15-20 minutos

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar que estemos en el directorio correcto
check_project_structure() {
    log "🔍 Verificando estructura del proyecto..."
    
    if [ ! -d "backend/src" ] || [ ! -d "frontend/src" ]; then
        error "Debes ejecutar este script desde el directorio raíz de stock-logistic-poc"
    fi
    
    if [ ! -f "backend/package.json" ]; then
        error "Backend no configurado. Ejecuta primero setup-stock-logistic-poc.sh"
    fi
    
    log "✅ Estructura del proyecto verificada"
}

# Actualizar package.json con dependencias LUC1
update_backend_dependencies() {
    log "📦 Actualizando dependencias del backend..."
    
    cd backend
    
    # Verificar si @gradio/client ya está instalado
    if ! npm list @gradio/client &> /dev/null; then
        npm install @gradio/client@^0.12.0 --save
        log "✅ @gradio/client instalado"
    else
        log "✅ @gradio/client ya instalado"
    fi
    
    cd ..
}

# Crear estructura de directorios para LUC1
create_luc1_directories() {
    log "📁 Creando estructura de directorios LUC1..."
    
    mkdir -p backend/src/services
    mkdir -p backend/tests/integration
    mkdir -p backend/logs
    
    log "✅ Directorios LUC1 creados"
}

# Copiar archivos de servicios desde los artefactos
copy_luc1_services() {
    log "📄 Copiando servicios LUC1..."
    
    info "Por favor, copia manualmente los siguientes archivos desde los artefactos de Claude:"
    echo ""
    echo -e "${CYAN}1. luc1Service.js → backend/src/services/luc1Service.js${NC}"
    echo -e "${CYAN}2. multiTransportistService.js → backend/src/services/multiTransportistService.js${NC}"
    echo -e "${CYAN}3. routeValidationService.js → backend/src/services/routeValidationService.js${NC}"
    echo -e "${CYAN}4. luc1Demo.js → backend/luc1Demo.js${NC}"
    echo -e "${CYAN}5. luc1Integration.test.js → backend/tests/integration/luc1Integration.test.js${NC}"
    echo ""
    
    read -p "¿Has copiado todos los archivos? (y/N): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        warn "Copia los archivos y ejecuta el script nuevamente"
        exit 1
    fi
}

# Crear masterQuoteService
create_master_service() {
    log "🎯 Creando servicio orquestador principal..."
    
    cat > backend/src/services/masterQuoteService.js << 'EOF'
/**
 * 🎯 MasterQuoteService - Orquestador Principal del Sistema
 */

const LUC1Service = require('./luc1Service');
const MultiTransportistService = require('./multiTransportistService');
const RouteValidationService = require('./routeValidationService');

class MasterQuoteService {
  constructor() {
    this.luc1Service = new LUC1Service();
    this.transportistService = new MultiTransportistService();
    this.routeService = new RouteValidationService();
  }

  async generateIntelligentQuote(quoteRequest) {
    try {
      console.log('🚀 Iniciando cotización inteligente...');
      
      // PASO 1: Consultas en paralelo
      const [transportistPrices, routeData] = await Promise.all([
        this.transportistService.getAllPrices(quoteRequest),
        this.routeService.getRouteDetails(quoteRequest.route.origin, quoteRequest.route.destination)
      ]);

      console.log(`✅ Datos obtenidos: ${transportistPrices.length} precios, ruta ${routeData.distance}km`);

      // PASO 2: Analizar restricciones si necesario
      let restrictions = { hasRestrictions: false, alerts: [] };
      if (quoteRequest.cargo.isHazardous || this.isSunday(quoteRequest.service.pickupDate)) {
        restrictions = await this.luc1Service.analyzeRouteRestrictions(
          routeData,
          quoteRequest.service.pickupDate,
          quoteRequest.cargo
        );
      }

      // PASO 3: LUC1 analiza todo
      const luc1Analysis = await this.luc1Service.analyzeTransportistPrices({
        transportistPrices,
        routeData,
        restrictions: restrictions.alerts || [],
        holidays: [], // Simplificado para POC
        quoteRequest
      });

      console.log(`🧠 LUC1 recomienda: ${luc1Analysis.recommendedTransportist} por €${luc1Analysis.basePrice}`);

      // PASO 4: Generar alternativas
      const alternatives = this.generateServiceAlternatives(luc1Analysis, routeData.estimatedTransitDays);

      // PASO 5: Compilar resultado final
      return {
        quoteId: this.generateQuoteId(),
        timestamp: new Date().toISOString(),
        confidence: luc1Analysis.confidence,
        
        route: {
          origin: quoteRequest.route.origin,
          destination: quoteRequest.route.destination,
          distance: routeData.distance,
          estimatedTransitDays: routeData.estimatedTransitDays,
          countries: routeData.countries
        },
        
        costBreakdown: {
          distanceRate: Math.round(luc1Analysis.basePrice * 0.4),
          fuelCost: Math.round(luc1Analysis.basePrice * 0.3),
          tollCost: Math.round(luc1Analysis.basePrice * 0.1),
          driverCost: Math.round(luc1Analysis.basePrice * 0.15),
          vehicleCost: Math.round(luc1Analysis.basePrice * 0.05),
          subtotal: luc1Analysis.basePrice,
          adjustmentFactor: 1 + (luc1Analysis.suggestedMargin / 100),
          margin: Math.round(luc1Analysis.basePrice * luc1Analysis.suggestedMargin / 100),
          totalWithoutVAT: luc1Analysis.finalPrice,
          vat: Math.round(luc1Analysis.finalPrice * 0.21),
          total: Math.round(luc1Analysis.finalPrice * 1.21)
        },
        
        alternatives: alternatives,
        
        intelligence: {
          sourcesConsulted: transportistPrices.length,
          recommendedTransportist: luc1Analysis.recommendedTransportist,
          usedAI: luc1Analysis.usedAI,
          processingTime: luc1Analysis.processingTime,
          luc1Reasoning: luc1Analysis.reasoning
        },
        
        alerts: [
          ...(luc1Analysis.alerts || []),
          ...(restrictions.alerts || [])
        ],
        
        validUntil: this.calculateValidUntil()
      };

    } catch (error) {
      console.error('❌ Error generando cotización:', error);
      throw new Error(`Error en cotización inteligente: ${error.message}`);
    }
  }

  generateServiceAlternatives(analysis, baseDays) {
    const basePrice = analysis.finalPrice;
    
    return [
      {
        type: 'Económica',
        price: Math.round(basePrice * 0.85),
        transitTime: baseDays + 1,
        description: 'Grupaje compartido, más económico',
        features: ['Grupaje', 'Flexibilidad fechas', 'Económico']
      },
      {
        type: 'Estándar',
        price: basePrice,
        transitTime: baseDays,
        description: 'Recomendación IA - Mejor relación calidad-precio',
        features: ['Carga completa', 'Seguimiento', 'Recomendado'],
        recommended: true
      },
      {
        type: 'Express',
        price: Math.round(basePrice * 1.25),
        transitTime: Math.max(1, baseDays - 1),
        description: 'Entrega prioritaria directa',
        features: ['Directo', 'Prioritario', 'Seguimiento premium']
      }
    ];
  }

  generateQuoteId() {
    const prefix = 'SL';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return `${prefix}-${year}-${random}`;
  }

  calculateValidUntil() {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // 7 días válida
    return validUntil.toISOString();
  }

  isSunday(dateString) {
    const date = new Date(dateString);
    return date.getDay() === 0;
  }
}

module.exports = MasterQuoteService;
EOF

    log "✅ MasterQuoteService creado"
}

# Actualizar variables de entorno
update_env_variables() {
    log "🔧 Actualizando variables de entorno..."
    
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
    fi
    
    # Añadir variables LUC1 si no existen
    if ! grep -q "LUC1_ENDPOINT" backend/.env; then
        echo "" >> backend/.env
        echo "# LUC1 AI Configuration" >> backend/.env
        echo "LUC1_ENDPOINT=https://lrodriolivera-luc1-comex-inference.hf.space" >> backend/.env
        echo "HUGGING_FACE_TOKEN=" >> backend/.env
    fi
    
    log "✅ Variables de entorno actualizadas"
}

# Crear scripts de utilidad
create_utility_scripts() {
    log "🛠️ Creando scripts de utilidad..."
    
    # Script para ejecutar demo
    cat > run-luc1-demo.sh << 'EOF'
#!/bin/bash

echo "🚀 Ejecutando Demostración LUC1 Stock Logistic..."
echo ""

cd backend
node luc1Demo.js
EOF

    chmod +x run-luc1-demo.sh
    
    # Script para ejecutar tests
    cat > run-luc1-tests.sh << 'EOF'
#!/bin/bash

echo "🧪 Ejecutando Tests de Integración LUC1..."
echo ""

cd backend
npm test -- tests/integration/luc1Integration.test.js
EOF

    chmod +x run-luc1-tests.sh
    
    log "✅ Scripts de utilidad creados"
}

# Verificar archivos copiados
verify_copied_files() {
    log "🔍 Verificando archivos copiados..."
    
    local files=(
        "backend/src/services/luc1Service.js"
        "backend/src/services/multiTransportistService.js"
        "backend/src/services/routeValidationService.js"
        "backend/luc1Demo.js"
        "backend/tests/integration/luc1Integration.test.js"
    )
    
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        error "❌ Archivos faltantes:"
        for file in "${missing_files[@]}"; do
            echo "   - $file"
        done
        echo ""
        echo "Por favor copia los archivos desde los artefactos de Claude y ejecuta el script nuevamente."
        exit 1
    fi
    
    log "✅ Todos los archivos verificados"
}

# Test rápido del sistema
quick_test() {
    log "🧪 Ejecutando test rápido del sistema..."
    
    cd backend
    
    # Test de sintaxis JavaScript
    if node -c src/services/luc1Service.js 2>/dev/null; then
        log "✅ luc1Service.js - sintaxis OK"
    else
        warn "⚠️ luc1Service.js - revisar sintaxis"
    fi
    
    if node -c src/services/masterQuoteService.js 2>/dev/null; then
        log "✅ masterQuoteService.js - sintaxis OK"
    else
        warn "⚠️ masterQuoteService.js - revisar sintaxis"
    fi
    
    # Test de dependencias
    if npm list @gradio/client &> /dev/null; then
        log "✅ Dependencias instaladas correctamente"
    else
        warn "⚠️ Revisar dependencias"
    fi
    
    cd ..
}

# Función principal
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║             🤖 PROMPT #2: INTEGRACIÓN LUC1-COMEX              ║"
    echo "║                                                                ║"
    echo "║    Implementación del Sistema de Análisis Inteligente         ║"
    echo "║    LUC1-COMEX para Cotizaciones de Transporte Terrestre       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    log "🎯 Iniciando integración LUC1-COMEX..."
    
    check_project_structure
    create_luc1_directories
    update_backend_dependencies
    copy_luc1_services
    create_master_service
    update_env_variables
    create_utility_scripts
    verify_copied_files
    quick_test
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                ✅ INTEGRACIÓN LUC1 COMPLETADA                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log "🎉 ¡Integración LUC1-COMEX completada exitosamente!"
    echo ""
    echo -e "${YELLOW}📋 SERVICIOS IMPLEMENTADOS:${NC}"
    echo "   🤖 LUC1Service - Integración con modelo LUC1-COMEX"
    echo "   🚛 MultiTransportistService - Simulador APIs transportistas"
    echo "   🗺️ RouteValidationService - Validación rutas europeas"
    echo "   🎯 MasterQuoteService - Orquestador principal"
    echo ""
    echo -e "${YELLOW}🚀 COMANDOS DISPONIBLES:${NC}"
    echo "   📊 Ejecutar demostración:  ./run-luc1-demo.sh"
    echo "   🧪 Ejecutar tests:         ./run-luc1-tests.sh"
    echo "   ⚙️ Iniciar desarrollo:     ./start-dev.sh"
    echo ""
    echo -e "${YELLOW}🔧 CONFIGURACIÓN PENDIENTE:${NC}"
    echo "   1. Configurar HUGGING_FACE_TOKEN en backend/.env (opcional)"
    echo "   2. Verificar conexión LUC1: ./run-luc1-demo.sh"
    echo ""
    echo -e "${BLUE}🎯 PRÓXIMO PASO: PROMPT #3 - APIs Externas${NC}"
    echo -e "${BLUE}   Integración Google Maps, TollGuru, Fuel Prices${NC}"
}

# Ejecutar script principal
main "$@"