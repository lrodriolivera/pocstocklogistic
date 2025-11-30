const request = require('supertest');
const app = require('../../app');

describe('End-to-End AI Integration Tests', () => {
  describe('LUC1-COMEX AI Service Integration', () => {
    test('should process AI analysis request', async () => {
      const analysisRequest = {
        route: {
          origin: 'Madrid, España',
          destination: 'Berlín, Alemania',
          distance: 1850,
          duration: 18.5
        },
        cargo: {
          type: 'forestry',
          weight: 15000,
          volume: 25.0,
          value: 35000,
          description: 'Madera de roble para muebles'
        },
        context: {
          season: 'winter',
          urgency: 'medium',
          budget: 'standard'
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .send(analysisRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('riskFactors');
      expect(response.body.data).toHaveProperty('optimizations');

      // Validate AI analysis structure
      const analysis = response.body.data.analysis;
      expect(analysis).toHaveProperty('confidence');
      expect(analysis).toHaveProperty('factors');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);

      // Validate recommendations
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);

      // Validate forestry-specific insights
      const forestryInsight = response.body.data.recommendations.find(rec =>
        rec.toLowerCase().includes('forest') ||
        rec.toLowerCase().includes('madera') ||
        rec.toLowerCase().includes('wood')
      );
      expect(forestryInsight).toBeDefined();
    });

    test('should handle different cargo types with specialized analysis', async () => {
      const cargoTypes = [
        {
          type: 'hazardous',
          weight: 8000,
          volume: 15.0,
          description: 'Productos químicos industriales'
        },
        {
          type: 'refrigerated',
          weight: 12000,
          volume: 30.0,
          description: 'Productos alimentarios congelados'
        },
        {
          type: 'oversized',
          weight: 45000,
          volume: 80.0,
          description: 'Maquinaria industrial pesada'
        }
      ];

      for (const cargo of cargoTypes) {
        const analysisRequest = {
          route: {
            origin: 'Barcelona, España',
            destination: 'Milano, Italia',
            distance: 850,
            duration: 9.5
          },
          cargo,
          context: {
            season: 'summer',
            urgency: 'high',
            budget: 'premium'
          }
        };

        const response = await request(app)
          .post('/api/ai/analyze')
          .send(analysisRequest)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Should provide cargo-specific insights
        const recommendations = response.body.data.recommendations;
        const hasCargoSpecificRec = recommendations.some(rec => {
          const recLower = rec.toLowerCase();
          switch (cargo.type) {
            case 'hazardous':
              return recLower.includes('adr') || recLower.includes('peligros') || recLower.includes('safety');
            case 'refrigerated':
              return recLower.includes('temperatura') || recLower.includes('cold') || recLower.includes('frio');
            case 'oversized':
              return recLower.includes('permit') || recLower.includes('route') || recLower.includes('dimension');
            default:
              return false;
          }
        });

        expect(hasCargoSpecificRec).toBe(true);
      }
    });

    test('should analyze route complexity and provide insights', async () => {
      const complexRouteRequest = {
        route: {
          origin: 'Londres, Reino Unido',
          destination: 'Istanbul, Turquía',
          distance: 2850,
          duration: 35.0,
          countries: ['Reino Unido', 'Francia', 'Bélgica', 'Alemania', 'Austria', 'Hungría', 'Bulgaria', 'Turquía']
        },
        cargo: {
          type: 'general',
          weight: 18000,
          volume: 35.0,
          value: 75000,
          description: 'Equipos electrónicos'
        },
        context: {
          season: 'winter',
          urgency: 'medium',
          budget: 'economy'
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .send(complexRouteRequest)
        .expect(200);

      expect(response.body.success).toBe(true);

      const riskFactors = response.body.data.riskFactors;
      expect(Array.isArray(riskFactors)).toBe(true);

      // Should identify complex route risks
      const hasComplexityRisk = riskFactors.some(risk =>
        risk.toLowerCase().includes('border') ||
        risk.toLowerCase().includes('customs') ||
        risk.toLowerCase().includes('brexit') ||
        risk.toLowerCase().includes('multiple')
      );

      expect(hasComplexityRisk).toBe(true);

      // Should provide optimization suggestions
      const optimizations = response.body.data.optimizations;
      expect(Array.isArray(optimizations)).toBe(true);
      expect(optimizations.length).toBeGreaterThan(0);
    });

    test('should provide seasonal and weather-aware recommendations', async () => {
      const winterRouteRequest = {
        route: {
          origin: 'Stockholm, Suecia',
          destination: 'München, Alemania',
          distance: 1350,
          duration: 15.0
        },
        cargo: {
          type: 'general',
          weight: 10000,
          volume: 20.0,
          value: 40000,
          description: 'Equipos industriales'
        },
        context: {
          season: 'winter',
          urgency: 'high',
          budget: 'standard',
          weatherConditions: 'snow_expected'
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .send(winterRouteRequest)
        .expect(200);

      expect(response.body.success).toBe(true);

      const recommendations = response.body.data.recommendations;
      const hasWeatherRec = recommendations.some(rec =>
        rec.toLowerCase().includes('winter') ||
        rec.toLowerCase().includes('snow') ||
        rec.toLowerCase().includes('weather') ||
        rec.toLowerCase().includes('clima')
      );

      expect(hasWeatherRec).toBe(true);

      // Should suggest extra time for winter conditions
      const hasTimeBuffer = recommendations.some(rec =>
        rec.toLowerCase().includes('time') ||
        rec.toLowerCase().includes('buffer') ||
        rec.toLowerCase().includes('delay')
      );

      expect(hasTimeBuffer).toBe(true);
    });

    test('should handle AI service errors gracefully', async () => {
      const invalidRequest = {
        route: {
          origin: '', // Invalid empty origin
          destination: 'Berlín, Alemania'
        },
        cargo: {
          type: 'invalid_type',
          weight: -1000, // Invalid negative weight
          volume: 0
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    test('should provide confidence scores and validation metrics', async () => {
      const standardRequest = {
        route: {
          origin: 'París, Francia',
          destination: 'Roma, Italia',
          distance: 1150,
          duration: 12.0
        },
        cargo: {
          type: 'general',
          weight: 5000,
          volume: 12.0,
          value: 25000,
          description: 'Productos textiles'
        },
        context: {
          season: 'spring',
          urgency: 'medium',
          budget: 'standard'
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .send(standardRequest)
        .expect(200);

      expect(response.body.success).toBe(true);

      const analysis = response.body.data.analysis;
      expect(analysis).toHaveProperty('confidence');
      expect(analysis).toHaveProperty('dataQuality');
      expect(analysis).toHaveProperty('modelVersion');

      // Confidence should be reasonable for standard route
      expect(analysis.confidence).toBeGreaterThanOrEqual(70);
      expect(analysis.confidence).toBeLessThanOrEqual(100);

      // Should include data quality metrics
      expect(analysis.dataQuality).toHaveProperty('routeData');
      expect(analysis.dataQuality).toHaveProperty('cargoData');
      expect(analysis.dataQuality).toHaveProperty('historicalData');
    });
  });

  describe('AI Model Performance and Monitoring', () => {
    test('should return AI model status and health', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('luc1Status');
      expect(response.body.data).toHaveProperty('modelVersion');
      expect(response.body.data).toHaveProperty('lastChecked');
      expect(response.body.data).toHaveProperty('performance');

      const performance = response.body.data.performance;
      expect(performance).toHaveProperty('averageResponseTime');
      expect(performance).toHaveProperty('successRate');
      expect(performance).toHaveProperty('totalRequests');

      expect(performance.successRate).toBeGreaterThanOrEqual(0);
      expect(performance.successRate).toBeLessThanOrEqual(100);
    });

    test('should handle bulk analysis requests efficiently', async () => {
      const bulkRequests = Array.from({ length: 5 }, (_, i) => ({
        route: {
          origin: `City${i}A, España`,
          destination: `City${i}B, Francia`,
          distance: 500 + i * 100,
          duration: 6 + i * 2
        },
        cargo: {
          type: 'general',
          weight: 1000 + i * 500,
          volume: 5 + i * 2,
          value: 10000 + i * 2000,
          description: `Test cargo ${i}`
        },
        context: {
          season: 'spring',
          urgency: 'medium',
          budget: 'standard'
        }
      }));

      const startTime = Date.now();

      const promises = bulkRequests.map(request =>
        request(app)
          .post('/api/ai/analyze')
          .send(request)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / bulkRequests.length;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should handle requests efficiently (under 10 seconds average)
      expect(averageTime).toBeLessThan(10000);

      console.log(`Bulk analysis performance: ${averageTime.toFixed(2)}ms average per request`);
    });
  });
});