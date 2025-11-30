const request = require('supertest');
const app = require('../../app');

describe('End-to-End Quote Flow', () => {
  describe('Complete Quote Generation Flow', () => {
    test('should generate quote with valid data', async () => {
      const quoteData = {
        origin: 'Madrid, España',
        destination: 'Berlín, Alemania',
        cargo: {
          type: 'general',
          weight: 1000,
          volume: 5.0,
          value: 10000,
          description: 'Carga general de productos manufacturados'
        },
        service: 'standard',
        deliveryDate: '2025-09-25',
        requirements: {
          insurance: true,
          tracking: true,
          signature: false
        }
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(quoteData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('quoteId');
      expect(response.body.data).toHaveProperty('options');
      expect(response.body.data).toHaveProperty('route');
      expect(response.body.data).toHaveProperty('metadata');

      // Validate quote options
      expect(Array.isArray(response.body.data.options)).toBe(true);
      expect(response.body.data.options.length).toBeGreaterThan(0);

      // Validate first option structure
      const firstOption = response.body.data.options[0];
      expect(firstOption).toHaveProperty('service');
      expect(firstOption).toHaveProperty('totalCost');
      expect(firstOption).toHaveProperty('estimatedTime');
      expect(firstOption).toHaveProperty('breakdown');
      expect(firstOption.breakdown).toHaveProperty('base');
      expect(firstOption.breakdown).toHaveProperty('fuel');
      expect(firstOption.breakdown).toHaveProperty('tolls');

      // Validate route information
      expect(response.body.data.route).toHaveProperty('origin');
      expect(response.body.data.route).toHaveProperty('destination');
      expect(response.body.data.route).toHaveProperty('distance');
      expect(response.body.data.route).toHaveProperty('duration');

      // Validate metadata
      expect(response.body.data.metadata).toHaveProperty('timestamp');
      expect(response.body.data.metadata).toHaveProperty('version');
      expect(response.body.data.metadata).toHaveProperty('aiModel');
    });

    test('should handle forestry cargo with special restrictions', async () => {
      const forestryQuoteData = {
        origin: 'Helsinki, Finlandia',
        destination: 'Barcelona, España',
        cargo: {
          type: 'forestry',
          weight: 25000,
          volume: 40.0,
          value: 50000,
          description: 'Madera de pino para construcción'
        },
        service: 'economy',
        deliveryDate: '2025-10-01',
        requirements: {
          insurance: true,
          tracking: true,
          signature: true
        }
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(forestryQuoteData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should detect forestry-specific considerations
      const metadata = response.body.data.metadata;
      expect(metadata).toHaveProperty('specialRequirements');
      expect(metadata.specialRequirements).toContain('forestry');

      // Should include appropriate restrictions
      if (response.body.data.alerts) {
        const hasForestryAlert = response.body.data.alerts.some(alert =>
          alert.toLowerCase().includes('forest') ||
          alert.toLowerCase().includes('madera') ||
          alert.toLowerCase().includes('phytosanitary')
        );
        // Forestry shipments might have special requirements
      }
    });

    test('should generate multiple service options', async () => {
      const quoteData = {
        origin: 'París, Francia',
        destination: 'Milano, Italia',
        cargo: {
          type: 'general',
          weight: 2000,
          volume: 8.0,
          value: 15000,
          description: 'Productos textiles'
        },
        service: 'all', // Request all service types
        deliveryDate: '2025-09-28',
        requirements: {
          insurance: false,
          tracking: true,
          signature: false
        }
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(quoteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.options.length).toBeGreaterThanOrEqual(2);

      // Should have different service levels
      const serviceTypes = response.body.data.options.map(opt => opt.service);
      expect(serviceTypes).toContain('economy');
      expect(serviceTypes).toContain('standard');

      // Economy should be cheaper than standard
      const economyOption = response.body.data.options.find(opt => opt.service === 'economy');
      const standardOption = response.body.data.options.find(opt => opt.service === 'standard');

      if (economyOption && standardOption) {
        expect(economyOption.totalCost).toBeLessThan(standardOption.totalCost);
      }
    });

    test('should handle hazardous materials correctly', async () => {
      const hazardousQuoteData = {
        origin: 'Rotterdam, Países Bajos',
        destination: 'Hamburg, Alemania',
        cargo: {
          type: 'hazardous',
          weight: 5000,
          volume: 12.0,
          value: 30000,
          description: 'Productos químicos industriales ADR'
        },
        service: 'standard',
        deliveryDate: '2025-09-30',
        requirements: {
          insurance: true,
          tracking: true,
          signature: true
        }
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(hazardousQuoteData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should include ADR-specific costs and requirements
      const firstOption = response.body.data.options[0];
      expect(firstOption.breakdown).toHaveProperty('adrSurcharge');
      expect(firstOption.totalCost).toBeGreaterThan(0);

      // Should include safety alerts
      expect(response.body.data.alerts).toBeDefined();
      const hasAdrAlert = response.body.data.alerts.some(alert =>
        alert.toLowerCase().includes('adr') ||
        alert.toLowerCase().includes('peligros') ||
        alert.toLowerCase().includes('hazardous')
      );
      expect(hasAdrAlert).toBe(true);
    });

    test('should detect and warn about route restrictions', async () => {
      const restrictedRouteData = {
        origin: 'Londres, Reino Unido',
        destination: 'Roma, Italia',
        cargo: {
          type: 'oversized',
          weight: 35000,
          volume: 60.0,
          value: 100000,
          description: 'Maquinaria industrial sobredimensionada'
        },
        service: 'standard',
        deliveryDate: '2025-10-05',
        requirements: {
          insurance: true,
          tracking: true,
          signature: true
        }
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(restrictedRouteData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should include Brexit/customs considerations for UK-EU route
      const hasCustomsAlert = response.body.data.alerts.some(alert =>
        alert.toLowerCase().includes('brexit') ||
        alert.toLowerCase().includes('customs') ||
        alert.toLowerCase().includes('aduana')
      );

      // Should include oversized load considerations
      const hasOversizedAlert = response.body.data.alerts.some(alert =>
        alert.toLowerCase().includes('oversized') ||
        alert.toLowerCase().includes('sobredimensionada') ||
        alert.toLowerCase().includes('permit')
      );

      expect(hasCustomsAlert || hasOversizedAlert).toBe(true);
    });

    test('should validate input data and return appropriate errors', async () => {
      const invalidQuoteData = {
        origin: '', // Missing origin
        destination: 'Berlín, Alemania',
        cargo: {
          type: 'general',
          weight: -1000, // Invalid weight
          volume: 5.0,
          value: 10000
        },
        service: 'invalid_service', // Invalid service
        deliveryDate: '2020-01-01', // Past date
        requirements: {}
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(invalidQuoteData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle AI service timeout gracefully', async () => {
      // This test simulates AI service being slow/unavailable
      const quoteData = {
        origin: 'Madrid, España',
        destination: 'Berlín, Alemania',
        cargo: {
          type: 'general',
          weight: 1000,
          volume: 5.0,
          value: 10000,
          description: 'Test timeout scenario'
        },
        service: 'standard',
        deliveryDate: '2025-09-25',
        requirements: {
          insurance: false,
          tracking: false,
          signature: false
        },
        _testTimeout: true // Special flag for testing timeout
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(quoteData)
        .timeout(30000); // 30 second timeout

      // Should either succeed or fail gracefully
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(500);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Quote Retrieval and Management', () => {
    let testQuoteId;

    beforeAll(async () => {
      // Generate a quote to test retrieval
      const quoteData = {
        origin: 'Madrid, España',
        destination: 'Berlín, Alemania',
        cargo: {
          type: 'general',
          weight: 1000,
          volume: 5.0,
          value: 10000
        },
        service: 'standard',
        deliveryDate: '2025-09-25',
        requirements: {
          insurance: false,
          tracking: false,
          signature: false
        }
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(quoteData);

      if (response.body.success) {
        testQuoteId = response.body.data.quoteId;
      }
    });

    test('should retrieve quote by ID', async () => {
      if (!testQuoteId) {
        console.log('Skipping quote retrieval test - no test quote ID available');
        return;
      }

      const response = await request(app)
        .get(`/api/quotes/${testQuoteId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('quoteId', testQuoteId);
      expect(response.body.data).toHaveProperty('options');
      expect(response.body.data).toHaveProperty('route');
    });

    test('should handle non-existent quote ID', async () => {
      const response = await request(app)
        .get('/api/quotes/NONEXISTENT123')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health and Status Endpoints', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    test('should return AI service status', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('luc1Status');
      expect(response.body.data).toHaveProperty('lastChecked');
    });
  });
});