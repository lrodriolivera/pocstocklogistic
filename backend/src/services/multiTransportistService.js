/**
 * 🚛 MultiTransportistService - Servicio Multi-Fuente de Transportistas
 *
 * Consulta múltiples plataformas de transporte (APIs reales o simuladas):
 * - Timocom (Premium europeo)
 * - Trans.eu (Europa Central/Este)
 * - Sennder (Digital)
 * - InstaFreight (Startup)
 * - Cargopedia (Alternativa)
 *
 * @author AXEL Team
 * @version 2.0.0 - Soporte para APIs reales + Fallback simulado
 */

const axios = require('axios');
const { TimocomAdapter, TransEuAdapter } = require('./transportist-adapters');

class MultiTransportistService {
  constructor() {
    // Modo de operación: 'real', 'mock', o 'hybrid'
    this.mode = process.env.TRANSPORTIST_API_MODE || 'mock';

    // Adaptadores de APIs reales
    this.adapters = {};

    // Configuración de fuentes
    this.sources = {
      timocom: {
        name: 'Timocom',
        baseUrl: 'https://api.timocom.com/v1', // Mock URL
        confidence: 92,
        coverage: 'europa',
        premium: true
      },
      cargopedia: {
        name: 'Cargopedia',
        baseUrl: 'https://api.cargopedia.com/v2', // Mock URL
        confidence: 80,
        coverage: 'europa',
        premium: false
      },
      sennder: {
        name: 'Sennder',
        baseUrl: 'https://api.sennder.com/quotes', // Mock URL
        confidence: 88,
        coverage: 'europa_premium',
        premium: true
      },
      instafreight: {
        name: 'InstaFreight',
        baseUrl: 'https://api.instafreight.com/v1', // Mock URL
        confidence: 75,
        coverage: 'europa_startup',
        premium: false
      }
    };

    // Inicializar adaptadores si estamos en modo real o hybrid
    this.initializeAdapters();

    console.log(`🚛 MultiTransportistService initialized in ${this.mode.toUpperCase()} mode`);
  }

  /**
   * 🔌 Inicializar adaptadores de APIs reales
   */
  initializeAdapters() {
    if (this.mode === 'mock') {
      console.log('📋 Using MOCK mode - No real API connections');
      return;
    }

    try {
      // Inicializar Timocom si hay credenciales
      if (process.env.TIMOCOM_API_KEY) {
        this.adapters.timocom = new TimocomAdapter({
          apiKey: process.env.TIMOCOM_API_KEY,
          clientId: process.env.TIMOCOM_CLIENT_ID,
          clientSecret: process.env.TIMOCOM_CLIENT_SECRET
        });
        console.log('✅ Timocom adapter ready');
      }

      // Inicializar Trans.eu si hay credenciales
      if (process.env.TRANSEU_API_KEY) {
        this.adapters.transeu = new TransEuAdapter({
          apiKey: process.env.TRANSEU_API_KEY,
          companyId: process.env.TRANSEU_COMPANY_ID
        });
        console.log('✅ Trans.eu adapter ready');
      }

      // TODO: Inicializar más adaptadores según disponibilidad
      // if (process.env.SENNDER_API_TOKEN) { ... }
      // if (process.env.INSTAFREIGHT_API_KEY) { ... }

    } catch (error) {
      console.error('⚠️ Error initializing adapters:', error.message);
      console.log('📋 Falling back to MOCK mode');
      this.mode = 'mock';
    }
  }

  /**
   * 🔍 Obtener precios de todos los transportistas
   * @param {Object} quoteRequest - Solicitud de cotización
   * @returns {Promise<Array>} Array de ofertas de transportistas
   */
  async getAllPrices(quoteRequest) {
    console.log(`🚛 Consultando transportistas (${this.mode} mode)...`);

    const promises = Object.keys(this.sources).map(sourceKey =>
      this.getPriceFromSource(sourceKey, quoteRequest)
    );

    try {
      const results = await Promise.allSettled(promises);

      const successfulPrices = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(price => price !== null);

      console.log(`✅ Obtenidos ${successfulPrices.length}/${results.length} precios de transportistas`);

      return successfulPrices;
    } catch (error) {
      console.error('❌ Error consultando transportistas:', error);
      return [];
    }
  }

  /**
   * 📡 Consultar precio de una fuente específica
   */
  async getPriceFromSource(sourceKey, quoteRequest) {
    const source = this.sources[sourceKey];
    const startTime = Date.now();

    try {
      // Intentar usar adapter real primero (si está disponible)
      if (this.adapters[sourceKey] && (this.mode === 'real' || this.mode === 'hybrid')) {
        console.log(`📡 ${source.name}: Using REAL API`);

        const adapter = this.adapters[sourceKey];

        // Inicializar adapter si no está conectado
        if (!adapter.isConnected) {
          await adapter.initialize();
        }

        // Obtener cotización real
        const realQuote = await adapter.getQuote(quoteRequest);

        if (realQuote) {
          console.log(`✅ ${source.name}: Real API quote - €${realQuote.price}`);
          return realQuote;
        }

        // Si falla la API real, caer a mock en modo hybrid
        if (this.mode === 'hybrid') {
          console.warn(`⚠️ ${source.name}: Real API failed, using mock fallback`);
        } else {
          return null;
        }
      }

      // Usar simulación (modo mock o fallback)
      console.log(`📋 ${source.name}: Using MOCK data`);
      const mockPrice = await this.simulateAPICall(sourceKey, quoteRequest);

      const responseTime = Date.now() - startTime;

      return {
        source: sourceKey,
        sourceName: source.name,
        price: mockPrice.price,
        confidence: source.confidence,
        responseTime,
        metadata: {
          serviceLevel: mockPrice.serviceLevel,
          availableCarriers: mockPrice.carriers,
          estimatedDays: mockPrice.days,
          coverage: source.coverage,
          isPremium: source.premium,
          isMock: true, // Indicador de que es simulado
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      console.warn(`⚠️ ${source.name} no disponible:`, error.message);
      return null;
    }
  }

  /**
   * 🎭 Simular llamada a API (reemplazar por APIs reales en producción)
   */
  async simulateAPICall(sourceKey, quoteRequest) {
    // Simular latencia de red
    const latency = this.getSimulatedLatency(sourceKey);
    await new Promise(resolve => setTimeout(resolve, latency));

    const route = quoteRequest.route;
    const cargo = quoteRequest.cargo;
    
    // Calcular precio base por distancia estimada
    const distance = this.estimateDistance(route.origin, route.destination);
    const basePrice = this.calculateBasePrice(distance, cargo);
    
    // Aplicar factores específicos por fuente
    const finalPrice = this.applySourceFactors(sourceKey, basePrice, route, cargo);
    
    return {
      price: Math.round(finalPrice),
      serviceLevel: this.getServiceLevel(sourceKey),
      carriers: this.getAvailableCarriers(sourceKey),
      days: Math.ceil(distance / 650) // ~650km por día
    };
  }

  /**
   * 📏 Estimar distancia entre ciudades (simplificado)
   */
  estimateDistance(origin, destination) {
    const distances = {
      // Rutas principales España-Europa
      'Madrid-París': 1270,
      'Madrid-Berlín': 1870,
      'Madrid-Roma': 1365,
      'Madrid-Varsovia': 2447,
      'Barcelona-París': 833,
      'Barcelona-Milán': 725,
      'Barcelona-Múnich': 1050,
      'Valencia-Roma': 1245,
      'Valencia-Nápoles': 1180,
      'Sevilla-Lisboa': 395,
      'Bilbao-París': 570,
      
      // Rutas internas España
      'Madrid-Barcelona': 625,
      'Madrid-Valencia': 355,
      'Madrid-Sevilla': 535,
      'Barcelona-Valencia': 350,
      
      // Rutas europeas
      'París-Berlín': 1055,
      'París-Roma': 1420,
      'París-Ámsterdam': 515,
      'Berlín-Varsovia': 575,
      'Milán-Múnich': 440,
      'Roma-Nápoles': 225
    };
    
    const routeKey = `${origin}-${destination}`;
    const reverseKey = `${destination}-${origin}`;
    
    return distances[routeKey] || distances[reverseKey] || 1200; // Default
  }

  /**
   * 💰 Calcular precio base
   */
  calculateBasePrice(distance, cargo) {
    // Precio base por km (€0.80-1.20 según tipo carga)
    let pricePerKm = 0.95;
    
    // Ajustes por tipo de carga
    switch (cargo.type) {
      case 'Madera y productos forestales':
        pricePerKm = 0.85; // Especialización
        break;
      case 'Productos químicos':
        pricePerKm = 1.15; // ADR premium
        break;
      case 'Productos refrigerados':
        pricePerKm = 1.10; // Equipo especial
        break;
      case 'Maquinaria industrial':
        pricePerKm = 1.05; // Peso/dimensiones
        break;
      default:
        pricePerKm = 0.95; // Mercancía general
    }
    
    // Ajuste por peso (economías de escala)
    const weight = cargo.weight || 15000;
    if (weight > 25000) pricePerKm *= 0.95; // Descuento carga pesada
    if (weight < 5000) pricePerKm *= 1.15; // Recargo carga ligera
    
    return distance * pricePerKm;
  }

  /**
   * 🔧 Aplicar factores específicos por fuente
   */
  applySourceFactors(sourceKey, basePrice, route, cargo) {
    let factor = 1.0;
    
    switch (sourceKey) {
      case 'timocom':
        // Premium service, precios más altos pero más confiables
        factor = 1.08;
        break;
        
      case 'cargopedia':
        // Competitivo, precios más bajos
        factor = 0.92;
        break;
        
      case 'sennder':
        // Digital, eficiente
        factor = 0.98;
        break;
        
      case 'instafreight':
        // Startup, muy competitivo
        factor = 0.88;
        break;
    }
    
    // Variación aleatoria ±5% para simular mercado real
    const randomVariation = 0.95 + (Math.random() * 0.1);
    
    return basePrice * factor * randomVariation;
  }

  /**
   * ⏱️ Simular latencia por fuente
   */
  getSimulatedLatency(sourceKey) {
    const latencies = {
      timocom: 800 + Math.random() * 400,      // 800-1200ms (API premium)
      cargopedia: 1200 + Math.random() * 800,  // 1200-2000ms (API más lenta)
      sennder: 600 + Math.random() * 300,      // 600-900ms (API moderna)
      instafreight: 500 + Math.random() * 200  // 500-700ms (API rápida)
    };
    
    return Math.round(latencies[sourceKey] || 1000);
  }

  /**
   * 🚛 Obtener transportistas disponibles
   */
  getAvailableCarriers(sourceKey) {
    const carriers = {
      timocom: 15 + Math.floor(Math.random() * 10),      // 15-25 transportistas
      cargopedia: 8 + Math.floor(Math.random() * 7),     // 8-15 transportistas
      sennder: 12 + Math.floor(Math.random() * 8),       // 12-20 transportistas
      instafreight: 5 + Math.floor(Math.random() * 5)    // 5-10 transportistas
    };
    
    return carriers[sourceKey] || 10;
  }

  /**
   * 📊 Nivel de servicio por fuente
   */
  getServiceLevel(sourceKey) {
    const levels = {
      timocom: 'Premium',
      cargopedia: 'Estándar',
      sennder: 'Express',
      instafreight: 'Económico'
    };
    
    return levels[sourceKey] || 'Estándar';
  }

  /**
   * 📈 Obtener estadísticas de mercado
   */
  getMarketStats() {
    return {
      sourcesActive: Object.keys(this.sources).length,
      averageResponseTime: 950, // ms
      coverageEurope: '95%',
      dailyQueries: 1247,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 🔍 Verificar disponibilidad de fuentes
   */
  async checkSourcesHealth() {
    const healthChecks = await Promise.allSettled(
      Object.keys(this.sources).map(async (sourceKey) => {
        try {
          // Simular health check
          await new Promise(resolve => setTimeout(resolve, 200));
          
          return {
            source: sourceKey,
            status: Math.random() > 0.1 ? 'healthy' : 'degraded', // 90% uptime
            responseTime: 150 + Math.random() * 100
          };
        } catch (error) {
          return {
            source: sourceKey,
            status: 'down',
            error: error.message
          };
        }
      })
    );

    return healthChecks.map(result => result.value || result.reason);
  }

  /**
   * 🎯 Obtener precio específico por corredor
   */
  async getCorridorPricing(origin, destination) {
    const corridorData = {
      route: `${origin} → ${destination}`,
      distance: this.estimateDistance(origin, destination),
      avgPricePerKm: 0.95,
      demandLevel: this.getCorridorDemand(origin, destination),
      restrictions: this.getCorridorRestrictions(origin, destination)
    };

    return corridorData;
  }

  getCorridorDemand(origin, destination) {
    // Simular demanda por corredor
    const highDemandRoutes = ['Madrid-París', 'Barcelona-Milán', 'Valencia-Roma'];
    const routeKey = `${origin}-${destination}`;
    
    if (highDemandRoutes.includes(routeKey)) {
      return 'high';
    } else if (Math.random() > 0.6) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  getCorridorRestrictions(origin, destination) {
    // Simular restricciones conocidas
    const restrictions = [];
    
    if (destination.includes('Suiza') || destination.includes('Austria')) {
      restrictions.push('Viñeta requerida');
    }
    
    if (origin.includes('España') && destination.includes('Francia')) {
      restrictions.push('Restricciones dominicales');
    }
    
    return restrictions;
  }
}

module.exports = MultiTransportistService;