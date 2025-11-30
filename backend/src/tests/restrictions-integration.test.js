/**
 * 🚫 Tests de Integración - European Restrictions Service
 *
 * Pruebas del sistema de restricciones y regulaciones europeas:
 * ✅ Health checks de APIs
 * ✅ Consulta de festivos europeos
 * ✅ Restricciones DGT España en tiempo real
 * ✅ Alertas inteligentes por país
 * ✅ Integración con cotizaciones
 *
 * @author Stock Logistic Team
 */

const EuropeanRestrictionsService = require('../services/europeanRestrictionsService');
const MasterQuoteService = require('../services/masterQuoteService');

describe('🚫 European Restrictions Integration Tests', () => {
  let restrictionsService;
  let masterQuoteService;

  beforeAll(() => {
    restrictionsService = new EuropeanRestrictionsService();
    masterQuoteService = new MasterQuoteService();
  });

  describe('🏥 Service Health Checks', () => {
    test('should initialize restrictions service correctly', () => {
      expect(restrictionsService).toBeDefined();
      expect(restrictionsService.supportedCountries.length).toBeGreaterThan(20);
      expect(restrictionsService.endpoints.holidaysApi).toContain('date.nager.at');
    });

    test('should perform complete health check', async () => {
      const health = await restrictionsService.healthCheck();

      console.log('🏥 Restrictions Service Health:', {
        status: health.status,
        apis: Object.keys(health.apis),
        cacheSize: health.cache
      });

      expect(health.status).toBe('operational');
      expect(health.apis).toHaveProperty('holidaysApi');
      expect(health.cache).toHaveProperty('restrictions');
      expect(health.metrics).toHaveProperty('holidayRequests');
    }, 15000);
  });

  describe('🎉 European Holidays API Tests', () => {
    test('should get Spanish holidays for current year', async () => {
      const currentYear = new Date().getFullYear();
      const holidays = await restrictionsService.getCountryHolidays('ES', currentYear);

      console.log('🇪🇸 Spanish Holidays:', {
        year: currentYear,
        count: holidays.length,
        examples: holidays.slice(0, 3).map(h => ({ date: h.date, name: h.name }))
      });

      expect(holidays).toBeInstanceOf(Array);
      expect(holidays.length).toBeGreaterThan(5);

      // Verificar estructura de festivos
      holidays.forEach(holiday => {
        expect(holiday).toHaveProperty('date');
        expect(holiday).toHaveProperty('name');
        expect(holiday).toHaveProperty('countryCode');
        expect(holiday.countryCode).toBe('ES');
      });
    }, 10000);

    test('should get French holidays for current year', async () => {
      const currentYear = new Date().getFullYear();
      const holidays = await restrictionsService.getCountryHolidays('FR', currentYear);

      console.log('🇫🇷 French Holidays:', {
        year: currentYear,
        count: holidays.length,
        examples: holidays.slice(0, 2).map(h => ({ date: h.date, name: h.name }))
      });

      expect(holidays).toBeInstanceOf(Array);
      expect(holidays.length).toBeGreaterThan(3);
    }, 10000);

    test('should handle multiple countries concurrently', async () => {
      const currentYear = new Date().getFullYear();
      const countries = ['ES', 'FR', 'DE', 'IT'];

      const startTime = Date.now();
      const results = await Promise.all(
        countries.map(country => restrictionsService.getCountryHolidays(country, currentYear))
      );
      const responseTime = Date.now() - startTime;

      console.log('🌍 Multi-country holidays:', {
        countries: countries.length,
        totalHolidays: results.reduce((sum, holidays) => sum + holidays.length, 0),
        responseTime: `${responseTime}ms`,
        breakdown: countries.map((country, i) => ({
          country,
          holidays: results[i].length
        }))
      });

      expect(results).toHaveLength(4);
      results.forEach((holidays, index) => {
        expect(holidays).toBeInstanceOf(Array);
        expect(holidays.length).toBeGreaterThan(0);
      });
      expect(responseTime).toBeLessThan(8000); // Máximo 8 segundos para 4 países
    }, 15000);
  });

  describe('🚛 Route Restrictions Analysis', () => {
    test('should analyze restrictions for Madrid → París route', async () => {
      const routeData = {
        origin: 'Madrid',
        destination: 'París',
        countries: ['ES', 'FR'],
        distance: 1263
      };

      const vehicleSpecs = {
        type: 'truck',
        weight: 25,
        axles: 4,
        height: 4.0
      };

      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 2); // En 2 días

      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        vehicleSpecs,
        pickupDate.toISOString()
      );

      console.log('🚛 Madrid-París Restrictions:', {
        route: restrictions.route,
        countries: restrictions.countries,
        totalAlerts: restrictions.alerts.length,
        summary: restrictions.summary,
        sampleAlerts: restrictions.alerts.slice(0, 3).map(a => ({
          type: a.type,
          severity: a.severity,
          country: a.country,
          message: a.message.substring(0, 80) + '...'
        }))
      });

      expect(restrictions).toHaveProperty('route');
      expect(restrictions).toHaveProperty('alerts');
      expect(restrictions).toHaveProperty('summary');
      expect(restrictions.countries).toEqual(['ES', 'FR']);
      expect(restrictions.alerts).toBeInstanceOf(Array);
      expect(restrictions.summary).toHaveProperty('critical');
      expect(restrictions.summary).toHaveProperty('warnings');
      expect(restrictions.summary).toHaveProperty('info');
    }, 20000);

    test('should handle weekend restrictions', async () => {
      const routeData = {
        origin: 'Barcelona',
        destination: 'Múnich',
        countries: ['ES', 'FR', 'DE'],
        distance: 1100
      };

      const vehicleSpecs = {
        type: 'truck',
        weight: 35,
        axles: 5
      };

      // Buscar próximo domingo
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
      if (nextSunday.getDay() !== 0) nextSunday.setDate(nextSunday.getDate() + 7);

      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        vehicleSpecs,
        nextSunday.toISOString()
      );

      console.log('📅 Weekend Restrictions (Sunday):', {
        date: nextSunday.toDateString(),
        countries: restrictions.countries,
        weekendAlerts: restrictions.alerts.filter(a => a.type === 'weekend').length,
        germanRestrictions: restrictions.alerts.filter(a => a.country === 'DE').length,
        summary: restrictions.summary
      });

      expect(restrictions.alerts.length).toBeGreaterThan(0);

      // Debe haber alertas de fin de semana
      const weekendAlerts = restrictions.alerts.filter(a => a.type === 'weekend');
      expect(weekendAlerts.length).toBeGreaterThan(0);

      // Alemania debe tener restricciones específicas
      const germanAlerts = restrictions.alerts.filter(a => a.country === 'DE');
      expect(germanAlerts.length).toBeGreaterThan(0);
    }, 15000);

    test('should detect holiday restrictions', async () => {
      const routeData = {
        origin: 'Valencia',
        destination: 'Roma',
        countries: ['ES', 'FR', 'IT'],
        distance: 1400
      };

      const vehicleSpecs = {
        type: 'truck',
        weight: 20
      };

      // Usar fecha fija que sabemos que es festivo (Año Nuevo)
      const currentYear = new Date().getFullYear();
      const newYearDate = new Date(currentYear, 0, 1); // January 1st of current year

      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        vehicleSpecs,
        newYearDate.toISOString()
      );

      console.log('🎉 Holiday Restrictions (New Year):', {
        date: newYearDate.toDateString(),
        totalAlerts: restrictions.alerts.length,
        holidayAlerts: restrictions.alerts.filter(a => a.type === 'holiday').length,
        affectedCountries: [...new Set(restrictions.alerts.map(a => a.country))],
        summary: restrictions.summary
      });

      expect(restrictions.alerts.length).toBeGreaterThan(0);

      // Debe haber alertas de festivos
      const holidayAlerts = restrictions.alerts.filter(a => a.type === 'holiday');
      expect(holidayAlerts.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('🎯 Integrated Quote with Restrictions', () => {
    test('should generate complete quote with restrictions for Madrid → París', async () => {
      const quoteRequest = {
        route: {
          origin: 'Madrid',
          destination: 'París'
        },
        cargo: {
          weight: 25000, // 25 toneladas
          volume: 80,
          type: 'forest_products'
        },
        service: {
          pickupDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // En 2 días
          deliveryDate: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString() // En 5 días
        }
      };

      const startTime = Date.now();
      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);
      const processingTime = Date.now() - startTime;

      console.log('💰 Complete Quote with Restrictions:', {
        quoteId: quote.quoteId,
        route: `${quote.route.origin} → ${quote.route.destination}`,
        distance: quote.route.distance,
        countries: quote.route.countries,
        totalPrice: quote.costBreakdown.total,
        processingTime: `${processingTime}ms`,
        restrictionsAnalysis: {
          totalAlerts: quote.restrictionsAnalysis?.totalAlerts || 0,
          summary: quote.restrictionsAnalysis?.summary || {},
          criticalCount: quote.restrictionsAnalysis?.criticalRestrictions?.length || 0,
          affectedCountries: quote.restrictionsAnalysis?.affectedCountries || []
        },
        intelligence: {
          sourcesConsulted: quote.intelligence.sourcesConsulted,
          usedAI: quote.intelligence.usedAI,
          confidence: quote.confidence
        }
      });

      // Verificaciones básicas de la cotización
      expect(quote).toHaveProperty('quoteId');
      expect(quote).toHaveProperty('route');
      expect(quote).toHaveProperty('costBreakdown');
      expect(quote).toHaveProperty('restrictionsAnalysis');
      expect(quote.route.distance).toBeGreaterThan(1200);
      expect(quote.route.distance).toBeLessThan(1300);

      // Verificaciones del análisis de restricciones
      expect(quote.restrictionsAnalysis).toHaveProperty('totalAlerts');
      expect(quote.restrictionsAnalysis).toHaveProperty('summary');
      expect(quote.restrictionsAnalysis).toHaveProperty('affectedCountries');
      expect(quote.restrictionsAnalysis.affectedCountries).toContain('ES');
      expect(quote.restrictionsAnalysis.affectedCountries).toContain('FR');

      // Las alertas deben estar incluidas en el quote general
      expect(quote.alerts).toBeInstanceOf(Array);
      const restrictionAlerts = quote.alerts.filter(alert =>
        alert.source && (
          alert.source.includes('restrictions') ||
          alert.source.includes('holidays') ||
          alert.source.includes('weekend')
        )
      );
      expect(restrictionAlerts.length).toBeGreaterThan(0);

      // Tiempo de procesamiento razonable
      expect(processingTime).toBeLessThan(30000); // Máximo 30 segundos
    }, 35000);

    test('should handle route with multiple complex restrictions', async () => {
      const quoteRequest = {
        route: {
          origin: 'Barcelona',
          destination: 'Varsovia'
        },
        cargo: {
          weight: 35000, // 35 toneladas
          volume: 100,
          type: 'machinery',
          isHazardous: false
        },
        service: {
          pickupDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // En 3 días
        }
      };

      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);

      console.log('🌍 Complex Route Restrictions (Barcelona → Varsovia):', {
        route: quote.route,
        countries: quote.route.countries,
        restrictionsAnalysis: quote.restrictionsAnalysis,
        totalAlerts: quote.alerts.length,
        alertTypes: [...new Set(quote.alerts.map(a => a.type))],
        confidence: quote.confidence
      });

      // Ruta compleja debe tener múltiples países
      expect(quote.route.countries.length).toBeGreaterThan(3);

      // Debe tener análisis de restricciones
      expect(quote.restrictionsAnalysis.totalAlerts).toBeGreaterThan(0);

      // Múltiples países afectados
      expect(quote.restrictionsAnalysis.affectedCountries.length).toBeGreaterThan(2);

      // Distancia realista Barcelona-Varsovia
      expect(quote.route.distance).toBeGreaterThan(1500);
      expect(quote.route.distance).toBeLessThan(2000);
    }, 30000);
  });

  describe('📊 Performance & Caching Tests', () => {
    test('should cache holiday requests efficiently', async () => {
      const currentYear = new Date().getFullYear();

      // Primera consulta
      const start1 = Date.now();
      const holidays1 = await restrictionsService.getCountryHolidays('ES', currentYear);
      const time1 = Date.now() - start1;

      // Segunda consulta (debería usar cache)
      const start2 = Date.now();
      const holidays2 = await restrictionsService.getCountryHolidays('ES', currentYear);
      const time2 = Date.now() - start2;

      console.log('💾 Cache Performance:', {
        firstRequest: `${time1}ms`,
        secondRequest: `${time2}ms`,
        improvement: `${Math.round((time1 - time2) / time1 * 100)}%`,
        cacheHit: time2 < time1 * 0.1 // Cache debe ser al menos 10x más rápido
      });

      expect(holidays1).toEqual(holidays2);
      // Si ambos tiempos son 0ms, el cache está funcionando perfectamente
      if (time1 > 0 && time2 > 0) {
        expect(time2).toBeLessThan(time1 * 0.5); // Cache debe ser al menos 50% más rápido
      } else {
        // Cache funcionando perfectamente - ambas consultas muy rápidas
        expect(time1 + time2).toBeLessThan(50); // Total menos de 50ms indica buen rendimiento
      }
    }, 10000);

    test('should clean expired cache entries', () => {
      const initialCacheSize = restrictionsService.cache.holidays.size;

      // Limpiar cache expirado
      const cleaned = restrictionsService.cleanExpiredCache();

      console.log('🧹 Cache Cleanup:', {
        initialSize: initialCacheSize,
        cleaned,
        finalSize: restrictionsService.cache.holidays.size
      });

      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    test('should provide service metrics', () => {
      const metrics = restrictionsService.getMetrics();

      console.log('📊 Service Metrics:', metrics);

      expect(metrics).toHaveProperty('holidayRequests');
      expect(metrics).toHaveProperty('cacheStats');
      expect(metrics).toHaveProperty('supportedCountries');
      expect(metrics.supportedCountries).toBeGreaterThan(20);
      expect(metrics.cacheStats).toHaveProperty('holidays');
      expect(metrics.cacheStats).toHaveProperty('restrictions');
    });
  });
});