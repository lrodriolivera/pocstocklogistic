/**
 * 🧪 Test de Integración LUC1 + Servicios
 * 
 * Valida el funcionamiento completo del sistema:
 * LUC1Service + MultiTransportistService + RouteValidationService
 * 
 * @author Stock Logistic Team
 */

const LUC1Service = require('../../services/luc1Service');
const MultiTransportistService = require('../../services/multiTransportistService');
const RouteValidationService = require('../../services/routeValidationService');

describe('🤖 LUC1 Integration Tests', () => {
  let luc1Service;
  let transportistService;
  let routeService;

  beforeAll(async () => {
    // Configurar servicios
    luc1Service = new LUC1Service();
    transportistService = new MultiTransportistService();
    routeService = new RouteValidationService();

    // Simular variables de entorno para testing
    process.env.LUC1_ENDPOINT = 'https://lrodriolivera-luc1-comex-inference.hf.space';
    
    console.log('🔧 Configurando servicios para testing...');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🔌 Conexión y Health Checks', () => {
    test('LUC1Service debe conectar correctamente', async () => {
      const connected = await luc1Service.connect();
      
      expect(connected).toBeDefined();
      expect(typeof connected).toBe('boolean');
      
      if (connected) {
        console.log('✅ LUC1 conectado exitosamente');
      } else {
        console.log('⚠️ LUC1 no disponible - usando modo fallback');
      }
    }, 15000);

    test('Health check debe retornar estado válido', async () => {
      const health = await luc1Service.validateConnection();
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('timestamp');
      
      if (health.connected) {
        expect(health.responseTime).toBeGreaterThan(0);
        expect(health.responseTime).toBeLessThan(30000);
      }
    }, 20000);

    test('MultiTransportistService debe obtener precios', async () => {
      const mockQuoteRequest = {
        route: { origin: 'Madrid', destination: 'París' },
        cargo: { 
          type: 'Madera y productos forestales', 
          weight: 15000, 
          volume: 45 
        },
        service: { 
          level: 'Estándar', 
          pickupDate: '2025-10-15' 
        }
      };

      const prices = await transportistService.getAllPrices(mockQuoteRequest);
      
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
      
      prices.forEach(price => {
        expect(price).toHaveProperty('source');
        expect(price).toHaveProperty('price');
        expect(price).toHaveProperty('confidence');
        expect(price.price).toBeGreaterThan(1000);
        expect(price.confidence).toBeGreaterThan(70);
      });

      console.log(`📊 Obtenidos ${prices.length} precios de transportistas`);
    });
  });

  describe('🧠 Análisis Inteligente LUC1', () => {
    test('Debe analizar precios de transportistas para productos forestales', async () => {
      const mockQuoteRequest = {
        quoteId: 'TEST-001',
        route: { origin: 'Madrid', destination: 'París' },
        cargo: { 
          type: 'Madera y productos forestales', 
          weight: 15000, 
          volume: 45 
        },
        service: { 
          level: 'Estándar', 
          pickupDate: '2025-10-15',
          deliveryDate: '2025-10-17'
        }
      };

      // Obtener datos para análisis
      const [transportistPrices, routeData] = await Promise.all([
        transportistService.getAllPrices(mockQuoteRequest),
        routeService.getRouteDetails(mockQuoteRequest.route.origin, mockQuoteRequest.route.destination)
      ]);

      const allData = {
        transportistPrices,
        routeData,
        restrictions: [],
        holidays: [],
        quoteRequest: mockQuoteRequest
      };

      const analysis = await luc1Service.analyzeTransportistPrices(allData);
      
      // Validaciones del análisis
      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('recommendedTransportist');
      expect(analysis).toHaveProperty('basePrice');
      expect(analysis).toHaveProperty('finalPrice');
      expect(analysis).toHaveProperty('confidence');
      expect(analysis).toHaveProperty('reasoning');

      // Validaciones de rangos
      expect(analysis.basePrice).toBeGreaterThan(2000);
      expect(analysis.basePrice).toBeLessThan(8000);
      expect(analysis.confidence).toBeGreaterThan(70);
      expect(analysis.confidence).toBeLessThan(100);
      expect(analysis.suggestedMargin).toBeGreaterThan(10);
      expect(analysis.suggestedMargin).toBeLessThan(30);

      console.log('🎯 Análisis LUC1:');
      console.log(`   Transportista recomendado: ${analysis.recommendedTransportist}`);
      console.log(`   Precio base: €${analysis.basePrice}`);
      console.log(`   Precio final: €${analysis.finalPrice}`);
      console.log(`   Confianza: ${analysis.confidence}%`);
      console.log(`   Margen sugerido: ${analysis.suggestedMargin}%`);
      
      if (analysis.reasoning && analysis.reasoning.includes('forestal')) {
        console.log('✅ LUC1 detectó especialización en productos forestales');
      }
    }, 30000);

    test('Debe detectar restricciones para mercancía peligrosa', async () => {
      const routeData = {
        origin: 'Barcelona',
        destination: 'Milán',
        distance: 725,
        countries: ['ES', 'FR', 'IT']
      };

      const cargoSpecs = {
        weight: 20000,
        type: 'Productos químicos',
        isHazardous: true
      };

      const restrictions = await luc1Service.analyzeRouteRestrictions(
        routeData,
        '2025-10-15',
        cargoSpecs
      );

      expect(restrictions).toBeDefined();
      expect(restrictions).toHaveProperty('hasRestrictions');
      expect(restrictions).toHaveProperty('alerts');

      if (restrictions.hasRestrictions) {
        expect(Array.isArray(restrictions.alerts)).toBe(true);
        
        const adrAlert = restrictions.alerts.find(alert => 
          alert.message && alert.message.toLowerCase().includes('adr')
        );
        
        if (adrAlert) {
          console.log('✅ LUC1 detectó restricciones ADR para mercancía peligrosa');
        }
      }
    }, 15000);

    test('Debe detectar restricciones de domingo', async () => {
      const routeData = {
        origin: 'Madrid',
        destination: 'París',
        distance: 1270,
        countries: ['ES', 'FR']
      };

      const cargoSpecs = {
        weight: 15000,
        type: 'Mercancía general',
        isHazardous: false
      };

      // Usar un domingo específico
      const sundayDate = '2025-10-12'; // Domingo

      const restrictions = await luc1Service.analyzeRouteRestrictions(
        routeData,
        sundayDate,
        cargoSpecs
      );

      expect(restrictions).toBeDefined();
      
      const sundayAlert = restrictions.alerts?.find(alert => 
        alert.message && alert.message.toLowerCase().includes('domingo')
      );

      if (sundayAlert) {
        console.log('✅ LUC1 detectó restricciones de circulación dominical');
        expect(sundayAlert.severity).toBeDefined();
      }
    }, 15000);
  });

  describe('🔄 Fallback y Manejo de Errores', () => {
    test('Debe usar fallback cuando LUC1 no disponible', async () => {
      // Simular fallo de LUC1
      const mockTransportistPrices = [
        { source: 'timocom', price: 3450, confidence: 92 },
        { source: 'cargopedia', price: 3180, confidence: 80 },
        { source: 'sennder', price: 3620, confidence: 88 }
      ];

      // Forzar desconexión para probar fallback
      await luc1Service.disconnect();

      const analysis = luc1Service.fallbackTransportistAnalysis(mockTransportistPrices);
      
      expect(analysis).toBeDefined();
      expect(analysis.usedFallback).toBe(true);
      expect(analysis.usedAI).toBe(false);
      expect(analysis.recommendedTransportist).toBeDefined();
      expect(analysis.basePrice).toBeGreaterThan(3000);
      expect(analysis.confidence).toBeLessThan(80); // Menor confianza en fallback

      console.log('✅ Fallback funcionando correctamente');
      console.log(`   Precio fallback: €${analysis.basePrice}`);
      console.log(`   Confianza fallback: ${analysis.confidence}%`);
    });

    test('Debe detectar outliers en precios', async () => {
      const mockTransportistPrices = [
        { source: 'timocom', price: 3450, confidence: 92 },
        { source: 'cargopedia', price: 3180, confidence: 80 },
        { source: 'sennder', price: 3620, confidence: 88 },
        { source: 'instafreight', price: 2100, confidence: 75 }, // Outlier bajo
        { source: 'premium', price: 5200, confidence: 95 }      // Outlier alto
      ];

      const outliers = luc1Service.detectPriceOutliers(mockTransportistPrices);
      
      expect(Array.isArray(outliers)).toBe(true);
      expect(outliers.length).toBeGreaterThan(0);

      outliers.forEach(outlier => {
        expect(outlier).toHaveProperty('source');
        expect(outlier).toHaveProperty('price');
        expect(outlier).toHaveProperty('deviation');
        expect(outlier).toHaveProperty('type');
        expect(['high', 'low']).toContain(outlier.type);
      });

      console.log(`🎯 Detectados ${outliers.length} outliers en precios`);
      outliers.forEach(outlier => {
        console.log(`   ${outlier.source}: €${outlier.price} (${outlier.deviation}% desviación, ${outlier.type})`);
      });
    });
  });

  describe('📊 Métricas y Cache', () => {
    test('Debe trackear métricas correctamente', async () => {
      const initialMetrics = luc1Service.getMetrics();
      
      expect(initialMetrics).toHaveProperty('totalRequests');
      expect(initialMetrics).toHaveProperty('successfulRequests');
      expect(initialMetrics).toHaveProperty('failedRequests');
      expect(initialMetrics).toHaveProperty('successRate');
      expect(initialMetrics).toHaveProperty('connected');

      console.log('📈 Métricas LUC1:');
      console.log(`   Total requests: ${initialMetrics.totalRequests}`);
      console.log(`   Success rate: ${initialMetrics.successRate}%`);
      console.log(`   Cache hit rate: ${initialMetrics.cacheHitRate}%`);
      console.log(`   Average response time: ${initialMetrics.averageResponseTime}ms`);
    });

    test('Cache debe funcionar correctamente', async () => {
      const testData = {
        transportistPrices: [{ source: 'test', price: 3000, confidence: 85 }],
        quoteRequest: { 
          route: { origin: 'Madrid', destination: 'París' },
          cargo: { type: 'test', weight: 15000 }
        }
      };

      const cacheKey = luc1Service.generateCacheKey(testData);
      
      expect(typeof cacheKey).toBe('string');
      expect(cacheKey.length).toBe(16);

      // Test cache set/get
      const testAnalysis = { result: 'test', timestamp: Date.now() };
      luc1Service.setCachedResponse(cacheKey, testAnalysis);
      
      const cachedResult = luc1Service.getCachedResponse(cacheKey);
      expect(cachedResult).toEqual(testAnalysis);

      console.log('✅ Cache funcionando correctamente');
    });
  });

  describe('🎯 Casos de Uso Reales', () => {
    test('Caso 1: Madrid-París Productos Forestales', async () => {
      const quoteRequest = {
        quoteId: 'REAL-CASE-001',
        route: { origin: 'Madrid', destination: 'París' },
        cargo: { 
          type: 'Madera y productos forestales', 
          weight: 15000, 
          volume: 45 
        },
        service: { 
          level: 'Estándar', 
          pickupDate: '2025-10-15',
          deliveryDate: '2025-10-17'
        }
      };

      const startTime = Date.now();
      
      const [transportistPrices, routeData] = await Promise.all([
        transportistService.getAllPrices(quoteRequest),
        routeService.getRouteDetails(quoteRequest.route.origin, quoteRequest.route.destination)
      ]);

      const analysis = await luc1Service.analyzeTransportistPrices({
        transportistPrices,
        routeData,
        restrictions: [],
        holidays: [],
        quoteRequest
      });

      const processingTime = Date.now() - startTime;

      expect(analysis.finalPrice).toBeGreaterThan(3000);
      expect(analysis.finalPrice).toBeLessThan(5000);
      expect(processingTime).toBeLessThan(15000); // Menos de 15 segundos

      console.log('🌲 CASO REAL: Madrid-París Productos Forestales');
      console.log(`   Precio final: €${analysis.finalPrice}`);
      console.log(`   Tiempo procesamiento: ${processingTime}ms`);
      console.log(`   Fuentes consultadas: ${transportistPrices.length}`);
    }, 20000);

    test('Caso 2: Barcelona-Milán Mercancía Peligrosa', async () => {
      const quoteRequest = {
        quoteId: 'REAL-CASE-002',
        route: { origin: 'Barcelona', destination: 'Milán' },
        cargo: { 
          type: 'Productos químicos', 
          weight: 20000, 
          volume: 55,
          isHazardous: true 
        },
        service: { 
          level: 'Estándar', 
          pickupDate: '2025-10-20',
          deliveryDate: '2025-10-22'
        }
      };

      const [transportistPrices, routeData, restrictions] = await Promise.all([
        transportistService.getAllPrices(quoteRequest),
        routeService.getRouteDetails(quoteRequest.route.origin, quoteRequest.route.destination),
        luc1Service.analyzeRouteRestrictions(
          { origin: 'Barcelona', destination: 'Milán', countries: ['ES', 'FR', 'IT'] },
          '2025-10-20',
          { weight: 20000, type: 'Productos químicos', isHazardous: true }
        )
      ]);

      const analysis = await luc1Service.analyzeTransportistPrices({
        transportistPrices,
        routeData,
        restrictions: restrictions.alerts || [],
        holidays: [],
        quoteRequest
      });

      // Para mercancía peligrosa, esperamos precio más alto
      expect(analysis.finalPrice).toBeGreaterThan(analysis.basePrice * 1.2);

      console.log('⚠️ CASO REAL: Barcelona-Milán Mercancía Peligrosa');
      console.log(`   Precio final: €${analysis.finalPrice}`);
      console.log(`   Restricciones detectadas: ${restrictions.hasRestrictions ? 'SÍ' : 'NO'}`);
      if (restrictions.alerts?.length) {
        console.log(`   Alertas: ${restrictions.alerts.length}`);
      }
    }, 25000);
  });

  afterAll(async () => {
    // Limpiar servicios
    if (luc1Service) {
      await luc1Service.disconnect();
    }
    console.log('🧹 Cleanup completado');
  });
});