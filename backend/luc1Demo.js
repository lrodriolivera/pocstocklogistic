#!/usr/bin/env node

/**
 * 🚀 Demo Script - Sistema Completo LUC1 Stock Logistic
 * 
 * Demostración del flujo completo:
 * 1. Consulta múltiples transportistas
 * 2. Validación de ruta
 * 3. Análisis inteligente LUC1
 * 4. Generación cotización final
 * 
 * Uso: node luc1Demo.js
 */

require('dotenv').config();
const LUC1Service = require('./src/services/luc1Service');
const MultiTransportistService = require('./src/services/multiTransportistService');
const RouteValidationService = require('./src/services/routeValidationService');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

class StockLogisticDemo {
  constructor() {
    this.luc1Service = new LUC1Service();
    this.transportistService = new MultiTransportistService();
    this.routeService = new RouteValidationService();
  }

  /**
   * 🎬 Ejecutar demostración completa
   */
  async runDemo() {
    try {
      this.printHeader();
      
      // Casos de demostración
      const demoCases = [
        {
          name: '🌲 Caso 1: Madrid-París Productos Forestales',
          quoteRequest: {
            quoteId: 'DEMO-001',
            route: { origin: 'Madrid', destination: 'París' },
            cargo: { 
              type: 'Madera y productos forestales', 
              weight: 15000, 
              volume: 45 
            },
            service: { 
              level: 'Estándar', 
              pickupDate: '2025-10-15',
              deliveryDate: '2025-10-17',
              additionalServices: ['Seguro de carga']
            },
            client: {
              name: 'Empresa Forestal Demo',
              email: 'demo@empresa.com'
            }
          }
        },
        {
          name: '⚠️ Caso 2: Barcelona-Milán Mercancía Peligrosa',
          quoteRequest: {
            quoteId: 'DEMO-002',
            route: { origin: 'Barcelona', destination: 'Milán' },
            cargo: { 
              type: 'Productos químicos', 
              weight: 20000, 
              volume: 55,
              isHazardous: true 
            },
            service: { 
              level: 'Express', 
              pickupDate: '2025-10-20',
              deliveryDate: '2025-10-22'
            },
            client: {
              name: 'Química Industrial SL',
              email: 'pedidos@quimica.com'
            }
          }
        },
        {
          name: '📅 Caso 3: Valencia-Roma Domingo (Restricciones)',
          quoteRequest: {
            quoteId: 'DEMO-003',
            route: { origin: 'Valencia', destination: 'Roma' },
            cargo: { 
              type: 'Mercancía general', 
              weight: 12000, 
              volume: 38 
            },
            service: { 
              level: 'Económico', 
              pickupDate: '2025-10-12', // Domingo
              deliveryDate: '2025-10-15'
            },
            client: {
              name: 'Comercial Mediterráneo',
              email: 'ops@comercial.es'
            }
          }
        }
      ];

      // Ejecutar cada caso
      for (const demoCase of demoCases) {
        await this.runSingleCase(demoCase);
        log('cyan', '\n' + '='.repeat(80) + '\n');
      }

      // Mostrar métricas finales
      await this.showFinalMetrics();

    } catch (error) {
      log('red', `❌ Error en demostración: ${error.message}`);
    }
  }

  /**
   * 🎯 Ejecutar un caso específico
   */
  async runSingleCase(demoCase) {
    const { name, quoteRequest } = demoCase;
    const startTime = Date.now();

    log('bright', name);
    log('blue', `📋 Solicitud: ${quoteRequest.route.origin} → ${quoteRequest.route.destination}`);
    log('blue', `📦 Carga: ${quoteRequest.cargo.weight}kg ${quoteRequest.cargo.type}`);
    log('blue', `📅 Fecha: ${quoteRequest.service.pickupDate}`);
    console.log();

    try {
      // PASO 1: Conectar LUC1 si es necesario
      log('yellow', '🔌 Paso 1: Verificando conexión LUC1-COMEX...');
      const health = await this.luc1Service.validateConnection();
      if (health.connected) {
        log('green', `✅ LUC1 conectado (${health.responseTime}ms)`);
      } else {
        log('yellow', '⚠️ LUC1 no disponible - usando modo fallback');
      }

      // PASO 2: Consultar transportistas
      log('yellow', '🚛 Paso 2: Consultando plataformas de transportistas...');
      const transportistPrices = await this.transportistService.getAllPrices(quoteRequest);
      
      log('green', `✅ Obtenidos ${transportistPrices.length} precios:`);
      transportistPrices.forEach(price => {
        log('cyan', `   • ${price.sourceName}: €${price.price} (${price.confidence}% confianza)`);
      });

      // PASO 3: Validar ruta
      log('yellow', '🗺️ Paso 3: Validando ruta y obteniendo detalles...');
      const routeData = await this.routeService.getRouteDetails(
        quoteRequest.route.origin, 
        quoteRequest.route.destination
      );
      
      log('green', `✅ Ruta validada:`);
      log('cyan', `   • Distancia: ${routeData.distance}km`);
      log('cyan', `   • Países: ${routeData.countries?.join(' → ')}`);
      log('cyan', `   • Tiempo estimado: ${routeData.estimatedTransitDays} días`);

      // PASO 4: Analizar restricciones si aplica
      let restrictions = { hasRestrictions: false, alerts: [] };
      if (quoteRequest.cargo.isHazardous || this.isSunday(quoteRequest.service.pickupDate)) {
        log('yellow', '🚫 Paso 4: Analizando restricciones...');
        restrictions = await this.luc1Service.analyzeRouteRestrictions(
          routeData,
          quoteRequest.service.pickupDate,
          quoteRequest.cargo
        );
        
        if (restrictions.hasRestrictions) {
          log('yellow', `⚠️ ${restrictions.alerts.length} restricciones detectadas:`);
          restrictions.alerts.forEach(alert => {
            log('magenta', `   • ${alert.message}`);
          });
        } else {
          log('green', '✅ Sin restricciones críticas');
        }
      }

      // PASO 5: Análisis inteligente LUC1
      log('yellow', '🧠 Paso 5: Análisis inteligente LUC1-COMEX...');
      const allData = {
        transportistPrices,
        routeData,
        restrictions: restrictions.alerts || [],
        holidays: [], // Simplificado para demo
        quoteRequest
      };

      const analysis = await this.luc1Service.analyzeTransportistPrices(allData);
      
      log('green', '✅ Análisis LUC1 completado:');
      log('cyan', `   • Transportista recomendado: ${analysis.recommendedTransportist.toUpperCase()}`);
      log('cyan', `   • Precio base: €${analysis.basePrice.toLocaleString()}`);
      log('cyan', `   • Margen sugerido: ${analysis.suggestedMargin}%`);
      log('cyan', `   • Precio final: €${analysis.finalPrice.toLocaleString()}`);
      log('cyan', `   • Confianza: ${analysis.confidence}%`);
      log('cyan', `   • Nivel servicio: ${analysis.serviceLevel}`);

      // PASO 6: Generar cotización final
      log('yellow', '📄 Paso 6: Generando cotización final...');
      const finalQuote = this.generateFinalQuote(quoteRequest, analysis, routeData, restrictions);
      
      this.printFinalQuote(finalQuote);

      // Métricas de rendimiento
      const totalTime = Date.now() - startTime;
      log('green', `⏱️ Tiempo total: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

      // Mostrar razonamiento IA si está disponible
      if (analysis.reasoning && analysis.usedAI) {
        log('yellow', '\n🤖 Razonamiento LUC1-COMEX:');
        console.log(this.truncateText(analysis.reasoning, 300));
      }

    } catch (error) {
      log('red', `❌ Error procesando caso: ${error.message}`);
    }
  }

  /**
   * 📋 Generar cotización final
   */
  generateFinalQuote(quoteRequest, analysis, routeData, restrictions) {
    const now = new Date();
    const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    return {
      quoteId: quoteRequest.quoteId,
      timestamp: now.toISOString(),
      validUntil: validUntil.toISOString(),
      
      route: {
        origin: quoteRequest.route.origin,
        destination: quoteRequest.route.destination,
        distance: routeData.distance,
        estimatedTransitDays: routeData.estimatedTransitDays,
        countries: routeData.countries
      },
      
      cargo: quoteRequest.cargo,
      
      pricing: {
        recommendedTransportist: analysis.recommendedTransportist,
        basePrice: analysis.basePrice,
        stockLogisticMargin: analysis.suggestedMargin,
        finalPriceWithoutVAT: analysis.finalPrice,
        vat: Math.round(analysis.finalPrice * 0.21),
        totalWithVAT: Math.round(analysis.finalPrice * 1.21),
        pricePerKm: (analysis.finalPrice / routeData.distance).toFixed(2)
      },
      
      alternatives: this.generateAlternatives(analysis.finalPrice, routeData.estimatedTransitDays),
      
      intelligence: {
        confidence: analysis.confidence,
        sourcesConsulted: analysis.sourcesAnalyzed,
        usedAI: analysis.usedAI || false,
        processingTime: analysis.processingTime || 0
      },
      
      alerts: [
        ...(analysis.alerts || []),
        ...(restrictions.alerts || [])
      ],
      
      client: quoteRequest.client
    };
  }

  /**
   * 🔄 Generar alternativas de servicio
   */
  generateAlternatives(basePrice, baseDays) {
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

  /**
   * 📄 Imprimir cotización final
   */
  printFinalQuote(quote) {
    log('bright', '\n📋 COTIZACIÓN FINAL STOCK LOGISTIC');
    console.log();
    
    log('cyan', `🆔 ID: ${quote.quoteId}`);
    log('cyan', `📅 Generada: ${new Date(quote.timestamp).toLocaleString('es-ES')}`);
    log('cyan', `⏰ Válida hasta: ${new Date(quote.validUntil).toLocaleString('es-ES')}`);
    
    console.log();
    log('yellow', '💰 PRECIOS:');
    log('green', `   Precio base: €${quote.pricing.basePrice.toLocaleString()}`);
    log('green', `   Margen Stock Logistic: ${quote.pricing.stockLogisticMargin}%`);
    log('green', `   Subtotal: €${quote.pricing.finalPriceWithoutVAT.toLocaleString()}`);
    log('green', `   IVA (21%): €${quote.pricing.vat.toLocaleString()}`);
    log('bright', `   TOTAL: €${quote.pricing.totalWithVAT.toLocaleString()}`);
    log('cyan', `   Precio/km: €${quote.pricing.pricePerKm}`);
    
    console.log();
    log('yellow', '🚛 ALTERNATIVAS:');
    quote.alternatives.forEach(alt => {
      const marker = alt.recommended ? '⭐' : '  ';
      log('cyan', `${marker} ${alt.type}: €${alt.price.toLocaleString()} (${alt.transitTime} días)`);
    });

    if (quote.alerts && quote.alerts.length > 0) {
      console.log();
      log('yellow', '⚠️ ALERTAS:');
      quote.alerts.forEach(alert => {
        const icon = alert.type === 'critical' ? '🚨' : '⚠️';
        log('magenta', `   ${icon} ${alert.message}`);
      });
    }

    console.log();
    log('yellow', '🔍 INTELIGENCIA:');
    log('cyan', `   Confianza: ${quote.intelligence.confidence}%`);
    log('cyan', `   Fuentes consultadas: ${quote.intelligence.sourcesConsulted}`);
    log('cyan', `   IA utilizada: ${quote.intelligence.usedAI ? 'SÍ' : 'NO (Fallback)'}`);
  }

  /**
   * 📊 Mostrar métricas finales
   */
  async showFinalMetrics() {
    log('bright', '📊 MÉTRICAS DEL SISTEMA');
    console.log();

    const luc1Metrics = this.luc1Service.getMetrics();
    const transportistStats = this.transportistService.getMarketStats();

    log('yellow', '🤖 LUC1-COMEX:');
    log('cyan', `   Total requests: ${luc1Metrics.totalRequests}`);
    log('cyan', `   Success rate: ${luc1Metrics.successRate}%`);
    log('cyan', `   Cache hit rate: ${luc1Metrics.cacheHitRate}%`);
    log('cyan', `   Average response time: ${luc1Metrics.averageResponseTime}ms`);
    log('cyan', `   Connected: ${luc1Metrics.connected ? 'SÍ' : 'NO'}`);

    console.log();
    log('yellow', '🚛 Transportistas:');
    log('cyan', `   Fuentes activas: ${transportistStats.sourcesActive}`);
    log('cyan', `   Cobertura Europa: ${transportistStats.coverageEurope}`);
    log('cyan', `   Consultas diarias: ${transportistStats.dailyQueries}`);

    console.log();
    log('green', '✅ Demostración completada exitosamente');
  }

  // ===== FUNCIONES AUXILIARES =====

  printHeader() {
    console.clear();
    log('bright', '╔═══════════════════════════════════════════════════════════════════════════════╗');
    log('bright', '║                    🚀 STOCK LOGISTIC POC - DEMOSTRACIÓN                      ║');
    log('bright', '║                                                                               ║');
    log('bright', '║              Sistema de Cotizaciones Inteligente con LUC1-COMEX             ║');
    log('bright', '╚═══════════════════════════════════════════════════════════════════════════════╝');
    console.log();
  }

  isSunday(dateString) {
    const date = new Date(dateString);
    return date.getDay() === 0;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// ===== EJECUCIÓN DEL SCRIPT =====

async function main() {
  const demo = new StockLogisticDemo();
  
  try {
    await demo.runDemo();
  } catch (error) {
    console.error('❌ Error fatal en demostración:', error);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = StockLogisticDemo;