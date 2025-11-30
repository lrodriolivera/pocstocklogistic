/**
 * Tests para el sistema de cálculo de metro lineal y LTL/FTL
 */

const loadCalculatorService = require('../services/loadCalculatorService');

describe('Load Calculator Service', () => {
  describe('calculateLinearMeters', () => {
    test('debe calcular metros lineales para europallets', () => {
      const items = [
        { type: 'europallet', quantity: 10, weight: 500 }
      ];

      const result = loadCalculatorService.calculateLinearMeters(items);

      expect(result.totalLinearMeters).toBe(4); // 10 pallets * 0.4m = 4m
      expect(result.totalWeight).toBe(5000); // 10 * 500kg
      expect(result.loadDetails).toHaveLength(1);
    });

    test('debe calcular metros lineales para múltiples tipos de equipamiento', () => {
      const items = [
        { type: 'europallet', quantity: 5, weight: 400 },
        { type: 'halfPallet', quantity: 4, weight: 200 },
        { type: 'rollCage', quantity: 2, weight: 300 }
      ];

      const result = loadCalculatorService.calculateLinearMeters(items);

      // 5 * 0.4 + 4 * 0.27 + 2 * 0.27 = 2 + 1.08 + 0.54 = 3.62
      expect(result.totalLinearMeters).toBeCloseTo(3.62, 1);
      expect(result.totalWeight).toBe(2000 + 800 + 600);
      expect(result.loadDetails).toHaveLength(3);
    });

    test('debe manejar items apilables correctamente', () => {
      const items = [
        { type: 'europallet', quantity: 6, weight: 500 }
      ];

      const result = loadCalculatorService.calculateLinearMeters(items);

      // Con 2.45m de ancho, caben 3 europallets por fila (0.8m ancho c/u)
      // 6 pallets = 2 filas = 0.8m metros lineales
      expect(result.totalLinearMeters).toBeLessThanOrEqual(2.4);
    });
  });

  describe('determineTransportType', () => {
    test('debe recomendar LTL para cargas pequeñas', () => {
      const loadMetrics = {
        totalLinearMeters: 3,
        totalWeight: 2000,
        totalVolume: 8
      };

      const result = loadCalculatorService.determineTransportType(loadMetrics);

      expect(result.type).toBe('LTL');
      expect(result.utilization.linear).toBeLessThan(65);
      expect(result.recommendation).toContain('Grupaje');
    });

    test('debe recomendar FTL para cargas grandes', () => {
      const loadMetrics = {
        totalLinearMeters: 10,
        totalWeight: 15000,
        totalVolume: 60
      };

      const result = loadCalculatorService.determineTransportType(loadMetrics);

      expect(result.type).toBe('FTL');
      expect(result.utilization.linear).toBeGreaterThan(65);
      expect(result.recommendation).toContain('Camión Completo');
    });

    test('debe recomendar FTL cuando se excede el 70% del peso máximo', () => {
      const loadMetrics = {
        totalLinearMeters: 5,
        totalWeight: 17000, // > 70% de 24000kg
        totalVolume: 30
      };

      const result = loadCalculatorService.determineTransportType(loadMetrics);

      expect(result.type).toBe('FTL');
      expect(result.utilization.weight).toBeGreaterThan(70);
    });
  });

  describe('calculatePrice', () => {
    test('debe calcular precio para LTL', () => {
      const loadMetrics = {
        totalLinearMeters: 4,
        totalWeight: 3000,
        totalVolume: 10
      };

      const result = loadCalculatorService.calculatePrice(
        loadMetrics,
        'LTL',
        500, // 500km
        { urgency: 'standard' }
      );

      expect(result.transportType).toBe('LTL');
      expect(result.basePrice).toBeGreaterThan(0);
      expect(result.pricePerLinearMeter).toBeGreaterThan(0);
      expect(result.breakdown).toHaveProperty('linearMeter');
      expect(result.breakdown).toHaveProperty('distance');
    });

    test('debe calcular precio para FTL', () => {
      const loadMetrics = {
        totalLinearMeters: 10,
        totalWeight: 15000,
        totalVolume: 60
      };

      const result = loadCalculatorService.calculatePrice(
        loadMetrics,
        'FTL',
        500,
        { urgency: 'standard' }
      );

      expect(result.transportType).toBe('FTL');
      expect(result.basePrice).toBeGreaterThan(0);
      expect(result.pricePerLinearMeter).toBeNull();
      expect(result.breakdown).toHaveProperty('base');
      expect(result.breakdown).toHaveProperty('distance');
    });

    test('debe aplicar multiplicador de urgencia', () => {
      const loadMetrics = {
        totalLinearMeters: 10,
        totalWeight: 15000,
        totalVolume: 60
      };

      const standardPrice = loadCalculatorService.calculatePrice(
        loadMetrics,
        'FTL',
        500,
        { urgency: 'standard' }
      );

      const expressPrice = loadCalculatorService.calculatePrice(
        loadMetrics,
        'FTL',
        500,
        { urgency: 'express' }
      );

      expect(expressPrice.totalPrice).toBeGreaterThan(standardPrice.totalPrice);
      expect(expressPrice.breakdown.urgency).toBeGreaterThan(0);
    });

    test('debe aplicar costos por servicios adicionales', () => {
      const loadMetrics = {
        totalLinearMeters: 4,
        totalWeight: 3000,
        totalVolume: 10
      };

      const baseResult = loadCalculatorService.calculatePrice(
        loadMetrics,
        'LTL',
        500,
        { urgency: 'standard', additionalServices: [] }
      );

      const withServicesResult = loadCalculatorService.calculatePrice(
        loadMetrics,
        'LTL',
        500,
        { urgency: 'standard', additionalServices: ['tailgate', 'insideDelivery'] }
      );

      expect(withServicesResult.totalPrice).toBeGreaterThan(baseResult.totalPrice);
      expect(withServicesResult.additionalCosts).toBe(125); // 50 + 75
    });
  });

  describe('validateLoad', () => {
    test('debe validar carga que cabe en el camión', () => {
      const loadMetrics = {
        totalLinearMeters: 10,
        totalWeight: 15000,
        totalVolume: 60
      };

      const result = loadCalculatorService.validateLoad(loadMetrics);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe detectar cuando se exceden los metros lineales', () => {
      const loadMetrics = {
        totalLinearMeters: 15, // > 13.6m
        totalWeight: 10000,
        totalVolume: 50
      };

      const result = loadCalculatorService.validateLoad(loadMetrics);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Excede metros lineales')
      );
    });

    test('debe detectar cuando se excede el peso máximo', () => {
      const loadMetrics = {
        totalLinearMeters: 10,
        totalWeight: 25000, // > 24000kg
        totalVolume: 50
      };

      const result = loadCalculatorService.validateLoad(loadMetrics);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Excede peso máximo')
      );
    });

    test('debe generar warnings para cargas cerca del límite', () => {
      const loadMetrics = {
        totalLinearMeters: 12.5, // > 90% de 13.6m
        totalWeight: 22000, // > 90% de 24000kg
        totalVolume: 80
      };

      const result = loadCalculatorService.validateLoad(loadMetrics);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('cerca del límite')
      );
    });
  });

  describe('optimizeLoad', () => {
    test('debe priorizar items no apilables', () => {
      const items = [
        { type: 'europallet', quantity: 5, weight: 500 },
        { type: 'rollCage', quantity: 2, weight: 300 },
        { type: 'halfPallet', quantity: 3, weight: 200 }
      ];

      const result = loadCalculatorService.optimizeLoad(items);

      // Roll cages (no apilables) deben ir primero
      expect(result.optimizedOrder[0].type).toBe('rollCage');
      expect(result.instructions).toHaveLength(items.length);
    });

    test('debe generar instrucciones de carga', () => {
      const items = [
        { type: 'europallet', quantity: 5, weight: 500 }
      ];

      const result = loadCalculatorService.optimizeLoad(items);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toHaveProperty('step');
      expect(result.instructions[0]).toHaveProperty('position');
      expect(result.instructions[0]).toHaveProperty('notes');
    });
  });
});

describe('Integration Tests', () => {
  test('flujo completo de cálculo LTL', () => {
    const items = [
      { type: 'europallet', quantity: 8, weight: 500 },
      { type: 'halfPallet', quantity: 4, weight: 200 }
    ];

    // Calcular metros lineales
    const loadMetrics = loadCalculatorService.calculateLinearMeters(items);
    expect(loadMetrics.totalLinearMeters).toBeGreaterThan(0);

    // Determinar tipo de transporte
    const transportType = loadCalculatorService.determineTransportType(loadMetrics);
    expect(transportType.type).toBe('LTL');

    // Calcular precio
    const pricing = loadCalculatorService.calculatePrice(
      loadMetrics,
      transportType.type,
      750,
      { urgency: 'standard' }
    );
    expect(pricing.totalPrice).toBeGreaterThan(0);

    // Validar carga
    const validation = loadCalculatorService.validateLoad(loadMetrics);
    expect(validation.valid).toBe(true);

    // Optimizar carga
    const optimization = loadCalculatorService.optimizeLoad(items);
    expect(optimization.optimizedOrder).toHaveLength(items.length);
  });

  test('flujo completo de cálculo FTL', () => {
    const items = [
      { type: 'europallet', quantity: 25, weight: 800 },
      { type: 'ibc', quantity: 4, weight: 1200 }
    ];

    // Calcular metros lineales
    const loadMetrics = loadCalculatorService.calculateLinearMeters(items);
    expect(loadMetrics.totalLinearMeters).toBeGreaterThan(8);

    // Determinar tipo de transporte
    const transportType = loadCalculatorService.determineTransportType(loadMetrics);
    expect(transportType.type).toBe('FTL');

    // Calcular precio con urgencia
    const pricing = loadCalculatorService.calculatePrice(
      loadMetrics,
      transportType.type,
      1200,
      {
        urgency: 'express',
        additionalServices: ['tempControlled']
      }
    );
    expect(pricing.totalPrice).toBeGreaterThan(pricing.basePrice);
    expect(pricing.additionalCosts).toBeGreaterThan(0);

    // Validar carga
    const validation = loadCalculatorService.validateLoad(loadMetrics);

    // Si excede límites, debe marcar como inválido
    if (loadMetrics.totalWeight > 24000) {
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    }
  });
});