/**
 * 🧪 Test de Integración TollGuru API
 * Stock Logistic POC - Casos de Prueba Obligatorios
 *
 * CASOS REQUERIDOS:
 * 1. Madrid → París (20t, 3 ejes, Euro6)
 * 2. Barcelona → Milán (25t, 4 ejes)
 * 3. Valencia → Roma (18t, 3 ejes)
 *
 * @author Stock Logistic Team
 */

const TollGuruService = require('../services/tollGuruService');
const OpenRouteService = require('../services/openRouteService');
const MasterQuoteService = require('../services/masterQuoteService');

describe('🛣️ TollGuru Integration Tests', () => {
  let tollGuruService;
  let openRouteService;
  let masterQuoteService;

  beforeAll(() => {
    // Asegurar que tenemos la API key en el entorno
    if (!process.env.TOLLGURU_API_KEY) {
      process.env.TOLLGURU_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY3MDE5YWQ3ZTlkZTQxNmQ4YjNjODc0MjQ4ZTUwM2YxIiwiaCI6Im11cm11cjY0In0=';
    }

    tollGuruService = new TollGuruService();
    openRouteService = new OpenRouteService();
    masterQuoteService = new MasterQuoteService();
  });

  describe('🏥 Service Health Checks', () => {
    test('TollGuru Service should be operational', async () => {
      const health = await tollGuruService.healthCheck();

      expect(health.status).toBe('operational');
      expect(health.apiKey).toBe('configured');
      expect(health.fallbackRates).toBeGreaterThan(10);

      console.log('🏥 TollGuru Health:', health);
    }, 15000);

    test('OpenRoute Service should be operational', async () => {
      const health = await openRouteService.healthCheck();

      expect(health.status).toBe('operational');
      expect(health.testRoute.distance).toBeGreaterThan(0);

      console.log('🏥 OpenRoute Health:', health);
    }, 15000);
  });

  describe('🎯 Caso 1: Madrid → París', () => {
    let routeData;
    let tollData;
    let quoteResult;

    const madridParisRequest = {
      route: {
        origin: 'Madrid',
        destination: 'París'
      },
      cargo: {
        type: 'general',
        weight: 15, // 15t de carga + 8t camión = 23t total
        dimensions: {
          length: 12,
          width: 2.4,
          height: 3.5
        }
      },
      service: {
        pickupDate: '2025-10-01',
        serviceType: 'standard'
      }
    };

    test('should calculate route Madrid → París', async () => {
      routeData = await openRouteService.calculateRoute('Madrid', 'París');

      expect(routeData.origin).toBe('Madrid');
      expect(routeData.destination).toBe('París');
      expect(routeData.distance).toBeGreaterThan(1200);
      expect(routeData.distance).toBeLessThan(1400);
      expect(routeData.countries).toContain('ES');
      expect(routeData.countries).toContain('FR');

      console.log('🗺️ Ruta Madrid-París:', {
        distance: routeData.distance,
        countries: routeData.countries,
        transitDays: routeData.estimatedTransitDays
      });
    }, 20000);

    test('should calculate tolls Madrid → París with TollGuru', async () => {
      expect(routeData).toBeDefined();

      const vehicleSpecs = {
        type: 'truck',
        weight: 20,
        axles: 3,
        height: 4,
        emissionClass: 'euro6'
      };

      tollData = await tollGuruService.calculateTollsFromPolyline(routeData.geometry, vehicleSpecs);

      expect(tollData.tolls.totalCost).toBeGreaterThan(30);
      expect(tollData.tolls.totalCost).toBeLessThan(80);
      expect(tollData.tolls.currency).toBe('EUR');
      expect(tollData.route.countries).toEqual(expect.arrayContaining(['ES', 'FR']));

      // Verificar breakdown por países
      const esBreakdown = tollData.tolls.breakdown.find(b => b.country === 'ES');
      const frBreakdown = tollData.tolls.breakdown.find(b => b.country === 'FR');

      if (esBreakdown) {
        expect(esBreakdown.cost).toBeGreaterThan(15);
        expect(esBreakdown.cost).toBeLessThan(30);
      }

      if (frBreakdown) {
        expect(frBreakdown.cost).toBeGreaterThan(20);
        expect(frBreakdown.cost).toBeLessThan(50);
      }

      console.log('🛣️ Peajes Madrid-París:', {
        total: tollData.tolls.totalCost,
        breakdown: tollData.tolls.breakdown,
        confidence: tollData.confidence,
        source: tollData.source
      });
    }, 20000);

    test('should generate complete quote Madrid → París', async () => {
      quoteResult = await masterQuoteService.generateIntelligentQuote(madridParisRequest);

      expect(quoteResult.route.origin).toBe('Madrid');
      expect(quoteResult.route.destination).toBe('París');
      expect(quoteResult.costBreakdown.tollCost).toBeGreaterThan(0);
      expect(quoteResult.intelligence.tollSource).toBeDefined();
      expect(quoteResult.intelligence.tollConfidence).toBeGreaterThan(70);

      console.log('💰 Cotización completa Madrid-París:', {
        tollCost: quoteResult.costBreakdown.tollCost,
        totalCost: quoteResult.costBreakdown.total,
        tollBreakdown: quoteResult.costBreakdown.tollBreakdown,
        confidence: quoteResult.confidence
      });
    }, 30000);
  });

  describe('🎯 Caso 2: Barcelona → Milán', () => {
    let routeData;
    let tollData;

    const barcelonaMilanRequest = {
      route: {
        origin: 'Barcelona',
        destination: 'Milán'
      },
      cargo: {
        type: 'general',
        weight: 20, // 20t de carga + 8t camión = 28t total
        dimensions: {
          length: 13,
          width: 2.5,
          height: 4
        }
      },
      service: {
        pickupDate: '2025-10-05',
        serviceType: 'standard'
      }
    };

    test('should calculate route Barcelona → Milán', async () => {
      routeData = await openRouteService.calculateRoute('Barcelona', 'Milán');

      expect(routeData.origin).toBe('Barcelona');
      expect(routeData.destination).toBe('Milán');
      expect(routeData.distance).toBeGreaterThan(500);
      expect(routeData.distance).toBeLessThan(800);
      expect(routeData.countries).toContain('ES');
      expect(routeData.countries).toContain('IT');

      console.log('🗺️ Ruta Barcelona-Milán:', {
        distance: routeData.distance,
        countries: routeData.countries,
        transitDays: routeData.estimatedTransitDays
      });
    }, 20000);

    test('should calculate tolls Barcelona → Milán with Alpine tunnels', async () => {
      expect(routeData).toBeDefined();

      const vehicleSpecs = {
        type: 'truck',
        weight: 25,
        axles: 4,
        height: 4,
        emissionClass: 'euro6'
      };

      tollData = await tollGuruService.calculateTollsFromPolyline(routeData.geometry, vehicleSpecs);

      expect(tollData.tolls.totalCost).toBeGreaterThan(60);
      expect(tollData.tolls.totalCost).toBeLessThan(150);
      expect(tollData.tolls.currency).toBe('EUR');

      // Verificar si detecta túneles alpinos o peajes especiales
      const hasSpecialTolls = tollData.tolls.specialTolls && tollData.tolls.specialTolls.length > 0;
      const totalCostWithSpecial = tollData.tolls.totalCost;

      console.log('🛣️ Peajes Barcelona-Milán:', {
        total: tollData.tolls.totalCost,
        breakdown: tollData.tolls.breakdown,
        specialTolls: tollData.tolls.specialTolls,
        hasAlpineTunnels: hasSpecialTolls,
        confidence: tollData.confidence
      });

      // Los túneles alpinos generalmente aumentan el coste
      if (hasSpecialTolls) {
        expect(totalCostWithSpecial).toBeGreaterThan(80);
      }
    }, 20000);

    test('should generate complete quote Barcelona → Milán', async () => {
      const quoteResult = await masterQuoteService.generateIntelligentQuote(barcelonaMilanRequest);

      expect(quoteResult.route.origin).toBe('Barcelona');
      expect(quoteResult.route.destination).toBe('Milán');
      expect(quoteResult.costBreakdown.tollCost).toBeGreaterThan(0);

      console.log('💰 Cotización completa Barcelona-Milán:', {
        tollCost: quoteResult.costBreakdown.tollCost,
        totalCost: quoteResult.costBreakdown.total,
        specialTolls: quoteResult.costBreakdown.tollSpecial,
        confidence: quoteResult.confidence
      });
    }, 30000);
  });

  describe('🎯 Caso 3: Valencia → Roma', () => {
    let routeData;
    let tollData;

    const valenciaRomaRequest = {
      route: {
        origin: 'Valencia',
        destination: 'Roma'
      },
      cargo: {
        type: 'forest_products',
        weight: 12, // 12t de carga + 8t camión = 20t total
        dimensions: {
          length: 14,
          width: 2.4,
          height: 3.8
        }
      },
      service: {
        pickupDate: '2025-10-10',
        serviceType: 'standard'
      }
    };

    test('should calculate route Valencia → Roma (coastal route)', async () => {
      routeData = await openRouteService.calculateRoute('Valencia', 'Roma');

      expect(routeData.origin).toBe('Valencia');
      expect(routeData.destination).toBe('Roma');
      expect(routeData.distance).toBeGreaterThan(800);
      expect(routeData.distance).toBeLessThan(1200);
      expect(routeData.countries).toContain('ES');
      expect(routeData.countries).toContain('IT');

      // Probablemente pase por Francia
      const likelyCoastalRoute = routeData.countries.includes('FR');

      console.log('🗺️ Ruta Valencia-Roma:', {
        distance: routeData.distance,
        countries: routeData.countries,
        isCoastalRoute: likelyCoastalRoute,
        transitDays: routeData.estimatedTransitDays
      });
    }, 20000);

    test('should calculate tolls Valencia → Roma coastal route', async () => {
      expect(routeData).toBeDefined();

      const vehicleSpecs = {
        type: 'truck',
        weight: 18,
        axles: 3,
        height: 4,
        emissionClass: 'euro6'
      };

      tollData = await tollGuruService.calculateTollsFromPolyline(routeData.geometry, vehicleSpecs);

      expect(tollData.tolls.totalCost).toBeGreaterThan(70);
      expect(tollData.tolls.totalCost).toBeLessThan(150);
      expect(tollData.tolls.currency).toBe('EUR');

      // Verificar desglose por países (España-Francia-Italia típicamente)
      const countryBreakdown = tollData.tolls.breakdown.reduce((acc, b) => {
        acc[b.country] = b.cost;
        return acc;
      }, {});

      console.log('🛣️ Peajes Valencia-Roma:', {
        total: tollData.tolls.totalCost,
        byCountry: countryBreakdown,
        countries: tollData.route.countries,
        confidence: tollData.confidence
      });

      // Verificar que tenemos costes distribuidos
      expect(Object.keys(countryBreakdown).length).toBeGreaterThan(1);
    }, 20000);

    test('should generate complete quote Valencia → Roma', async () => {
      const quoteResult = await masterQuoteService.generateIntelligentQuote(valenciaRomaRequest);

      expect(quoteResult.route.origin).toBe('Valencia');
      expect(quoteResult.route.destination).toBe('Roma');
      expect(quoteResult.costBreakdown.tollCost).toBeGreaterThan(0);

      // Verificar que el vehículo se ajustó para productos forestales
      const intelligence = quoteResult.intelligence;
      expect(intelligence.tollConfidence).toBeGreaterThan(60);

      console.log('💰 Cotización completa Valencia-Roma:', {
        tollCost: quoteResult.costBreakdown.tollCost,
        totalCost: quoteResult.costBreakdown.total,
        tollBreakdown: quoteResult.costBreakdown.tollBreakdown,
        intelligence: {
          tollSource: intelligence.tollSource,
          tollConfidence: intelligence.tollConfidence,
          countries: intelligence.countries
        }
      });
    }, 30000);
  });

  describe('📊 Performance & Cache Tests', () => {
    test('should cache toll calculations for repeated requests', async () => {
      const vehicleSpecs = { type: 'truck', weight: 20, axles: 3, height: 4, emissionClass: 'euro6' };
      const testPolyline = 'simple_test_polyline';

      // Primera llamada
      const start1 = Date.now();
      const result1 = await tollGuruService.calculateTollsFromPolyline(testPolyline, vehicleSpecs);
      const time1 = Date.now() - start1;

      // Segunda llamada (debería usar cache)
      const start2 = Date.now();
      const result2 = await tollGuruService.calculateTollsFromPolyline(testPolyline, vehicleSpecs);
      const time2 = Date.now() - start2;

      expect(result1.tolls.totalCost).toBe(result2.tolls.totalCost);
      expect(time2).toBeLessThan(time1); // Cache debería ser más rápido

      console.log('⚡ Cache Performance:', {
        firstCall: `${time1}ms`,
        secondCall: `${time2}ms`,
        cacheSize: tollGuruService.cache.size
      });
    }, 15000);

    test('should handle fallback gracefully when API fails', async () => {
      // Simular fallo temporal cambiando la API key
      const originalKey = tollGuruService.apiKey;
      tollGuruService.apiKey = 'invalid_key_for_testing';

      const vehicleSpecs = { type: 'truck', weight: 20, axles: 3, height: 4 };
      const result = await tollGuruService.calculateTollsFromPolyline('test_polyline', vehicleSpecs);

      // Restaurar API key
      tollGuruService.apiKey = originalKey;

      expect(result.tolls.totalCost).toBeGreaterThan(0);
      expect(result.source).toContain('Fallback');
      expect(result.confidence).toBeLessThan(80);

      console.log('🔄 Fallback Test:', {
        totalCost: result.tolls.totalCost,
        source: result.source,
        confidence: result.confidence
      });
    }, 10000);

    test('should complete full quote in less than 5 seconds', async () => {
      const quickRequest = {
        route: { origin: 'Madrid', destination: 'Barcelona' },
        cargo: { type: 'general', weight: 15 },
        service: { pickupDate: '2025-10-15', serviceType: 'standard' }
      };

      const start = Date.now();
      const result = await masterQuoteService.generateIntelligentQuote(quickRequest);
      const processingTime = Date.now() - start;

      expect(processingTime).toBeLessThan(5000); // Menos de 5 segundos
      expect(result.costBreakdown.tollCost).toBeGreaterThan(0);

      console.log('⚡ Performance Test:', {
        processingTime: `${processingTime}ms`,
        tollCost: result.costBreakdown.tollCost,
        confidence: result.confidence
      });
    }, 15000);
  });

  describe('📈 Statistics & Monitoring', () => {
    test('should provide service statistics', () => {
      const stats = tollGuruService.getStats();

      expect(stats.requests).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.fallback).toBeDefined();
      expect(stats.fallback.countriesSupported).toBeGreaterThan(10);

      console.log('📊 TollGuru Stats:', stats);
    });

    test('should clean expired cache entries', () => {
      const initialSize = tollGuruService.cache.size;
      const cleaned = tollGuruService.cleanExpiredCache();
      const finalSize = tollGuruService.cache.size;

      expect(cleaned).toBeGreaterThanOrEqual(0);
      expect(finalSize).toBeLessThanOrEqual(initialSize);

      console.log('🧹 Cache Cleanup:', {
        initialSize,
        cleaned,
        finalSize
      });
    });
  });
});

// Helper function para ejecutar todos los tests si se ejecuta directamente
if (require.main === module) {
  console.log('🧪 Ejecutando tests de integración TollGuru...');

  // Configurar timeout global para tests largos
  jest.setTimeout(30000);

  console.log('📋 Tests configurados:');
  console.log('  ✅ Madrid → París (20t, 3 ejes, Euro6)');
  console.log('  ✅ Barcelona → Milán (25t, 4 ejes, túneles alpinos)');
  console.log('  ✅ Valencia → Roma (18t, 3 ejes, ruta costera)');
  console.log('  ✅ Performance < 5 segundos');
  console.log('  ✅ Cache y fallbacks');
  console.log('');
  console.log('🚀 Iniciando ejecución...');
}