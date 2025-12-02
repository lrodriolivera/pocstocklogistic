/**
 * Load Calculator Controller
 */

const loadCalculatorService = require('../services/loadCalculatorService');

class LoadCalculatorController {
  /**
   * Calcula metros lineales y tipo de transporte
   */
  async calculateLoad(req, res) {
    try {
      const { items, distance, urgency, additionalServices } = req.body;

      // Validar entrada
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Se requiere al menos un item de carga'
        });
      }

      // Calcular metros lineales
      const loadMetrics = loadCalculatorService.calculateLinearMeters(items);

      // Determinar tipo de transporte
      const transportRecommendation = loadCalculatorService.determineTransportType(loadMetrics);

      // Calcular precio si se proporciona distancia
      let pricing = null;
      if (distance) {
        pricing = loadCalculatorService.calculatePrice(
          loadMetrics,
          transportRecommendation.type,
          distance,
          { urgency, additionalServices }
        );
      }

      // Optimizar disposición de carga
      const loadOptimization = loadCalculatorService.optimizeLoad(items);

      // Validar si cabe en camión estándar
      const validation = loadCalculatorService.validateLoad(loadMetrics);

      res.json({
        success: true,
        loadMetrics,
        transportRecommendation,
        pricing,
        optimization: loadOptimization,
        validation,
        summary: {
          totalLinearMeters: loadMetrics.totalLinearMeters,
          totalWeight: `${loadMetrics.totalWeight} kg`,
          totalVolume: `${loadMetrics.totalVolume} m³`,
          recommendedTransport: transportRecommendation.type,
          utilization: `${transportRecommendation.utilization.linear}%`,
          estimatedPrice: pricing ? `€${pricing.totalPrice}` : null
        }
      });
    } catch (error) {
      console.error('Error en cálculo de carga:', error);
      res.status(500).json({
        error: 'Error al calcular la carga',
        message: error.message
      });
    }
  }

  /**
   * Calcula usando entrada manual de metros lineales
   */
  async calculateManualLoad(req, res) {
    try {
      const { linearMeters, weight, distance, urgency, additionalServices } = req.body;

      // Validar entrada
      if (!linearMeters || linearMeters <= 0) {
        return res.status(400).json({
          error: 'Se requiere un valor válido de metros lineales'
        });
      }

      if (linearMeters > 13.6) {
        return res.status(400).json({
          error: 'Los metros lineales no pueden exceder 13.6m (un trailer estándar)'
        });
      }

      // Crear métricas de carga manual
      const loadMetrics = {
        totalLinearMeters: parseFloat(linearMeters),
        totalWeight: parseFloat(weight) || 0,
        totalVolume: 0, // No se puede calcular sin dimensiones
        loadDetails: [{
          type: 'manual',
          name: 'Entrada Manual',
          description: 'Metros lineales introducidos manualmente',
          quantity: 1,
          dimensions: {
            length: parseFloat(linearMeters),
            width: 2.45, // Ancho del camión
            height: 2.7, // Altura del camión
            volume: parseFloat(linearMeters) * 2.45 * 2.7
          },
          linearMeters: parseFloat(linearMeters),
          weight: parseFloat(weight) || 0,
          weightPerPiece: parseFloat(weight) || 0,
          volume: parseFloat(linearMeters) * 2.45 * 2.7,
          color: '#FFA500',
          allowRotation: false,
          stackingOptions: {
            allowStackingOn: false,
            allowStackingUnder: false
          },
          includeInLoad: true
        }],
        totalItems: 1
      };

      // Determinar tipo de transporte
      const transportRecommendation = loadCalculatorService.determineTransportType(loadMetrics);

      // Calcular precio si se proporciona distancia
      let pricing = null;
      if (distance) {
        pricing = loadCalculatorService.calculatePrice(
          loadMetrics,
          transportRecommendation.type,
          distance,
          { urgency, additionalServices }
        );
      }

      // Validar si cabe en camión estándar
      const validation = loadCalculatorService.validateLoad(loadMetrics);

      res.json({
        success: true,
        loadMetrics,
        transportRecommendation,
        pricing,
        optimization: null, // No hay optimización para entrada manual
        validation,
        summary: {
          totalLinearMeters: loadMetrics.totalLinearMeters,
          totalWeight: `${loadMetrics.totalWeight} kg`,
          totalVolume: `${loadMetrics.loadDetails[0].volume.toFixed(2)} m³`,
          recommendedTransport: transportRecommendation.type,
          utilization: `${transportRecommendation.utilization.linear}%`,
          estimatedPrice: pricing ? `€${pricing.totalPrice}` : null
        }
      });
    } catch (error) {
      console.error('Error en cálculo manual de carga:', error);
      res.status(500).json({
        error: 'Error al calcular la carga manual',
        message: error.message
      });
    }
  }

  /**
   * Obtiene tipos de equipamiento disponibles
   */
  async getEquipmentTypes(req, res) {
    try {
      const equipmentTypes = loadCalculatorService.equipmentTypes;

      const formattedTypes = Object.entries(equipmentTypes).map(([key, value]) => ({
        id: key,
        name: value.name,
        dimensions: {
          length: value.length,
          width: value.width,
          height: value.height
        },
        maxHeight: value.maxHeight,
        maxWeight: value.maxWeight,
        stackable: value.stackable,
        linearMeter: value.linearMeter,
        customDimensions: value.customDimensions || false
      }));

      res.json({
        success: true,
        equipmentTypes: formattedTypes,
        truckDimensions: loadCalculatorService.truckDimensions
      });
    } catch (error) {
      console.error('Error obteniendo tipos de equipamiento:', error);
      res.status(500).json({
        error: 'Error al obtener tipos de equipamiento',
        message: error.message
      });
    }
  }

  /**
   * Calcula precio detallado para configuración específica
   */
  async calculateDetailedPrice(req, res) {
    try {
      const { loadMetrics, transportType, distance, origin, destination, options } = req.body;

      // Validar entrada
      if (!loadMetrics || !transportType || !distance) {
        return res.status(400).json({
          error: 'Se requieren métricas de carga, tipo de transporte y distancia'
        });
      }

      // Calcular precio base
      const basePrice = loadCalculatorService.calculatePrice(
        loadMetrics,
        transportType,
        distance,
        options
      );

      // Añadir factores adicionales basados en ruta
      let routeFactors = 1.0;
      const detailedBreakdown = { ...basePrice.breakdown };

      // Factor por país (algunos países son más caros)
      const expensiveCountries = ['CH', 'NO', 'DK', 'SE'];
      const countryFactor = expensiveCountries.some(c =>
        origin?.country === c || destination?.country === c
      ) ? 1.15 : 1.0;

      // Factor por zona urbana
      const urbanFactor = (origin?.urban || destination?.urban) ? 1.1 : 1.0;

      // Factor por temporada (verano/navidad más caro)
      const month = new Date().getMonth();
      const seasonalFactor = [6, 7, 11].includes(month) ? 1.1 : 1.0;

      routeFactors = countryFactor * urbanFactor * seasonalFactor;

      const adjustedPrice = basePrice.totalPrice * routeFactors;

      detailedBreakdown.countryAdjustment = (countryFactor - 1) * basePrice.basePrice;
      detailedBreakdown.urbanAdjustment = (urbanFactor - 1) * basePrice.basePrice;
      detailedBreakdown.seasonalAdjustment = (seasonalFactor - 1) * basePrice.basePrice;

      res.json({
        success: true,
        pricing: {
          ...basePrice,
          adjustedPrice: Math.round(adjustedPrice * 100) / 100,
          factors: {
            country: countryFactor,
            urban: urbanFactor,
            seasonal: seasonalFactor,
            total: routeFactors
          },
          detailedBreakdown
        },
        comparison: {
          ltlEstimate: transportType === 'FTL' ?
            loadCalculatorService.calculatePrice(loadMetrics, 'LTL', distance, options).totalPrice :
            null,
          ftlEstimate: transportType === 'LTL' ?
            loadCalculatorService.calculatePrice(loadMetrics, 'FTL', distance, options).totalPrice :
            null,
          savings: null
        }
      });
    } catch (error) {
      console.error('Error calculando precio detallado:', error);
      res.status(500).json({
        error: 'Error al calcular precio detallado',
        message: error.message
      });
    }
  }

  /**
   * Calcula carga avanzada con tipos personalizados
   */
  async calculateAdvanced(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Se requiere al menos un item de carga'
        });
      }

      // Usar el método de cálculo avanzado
      const result = loadCalculatorService.calculateAdvancedLoad(items);

      res.json(result);
    } catch (error) {
      console.error('Error en cálculo avanzado:', error);
      res.status(500).json({
        error: 'Error al calcular la carga avanzada',
        message: error.message
      });
    }
  }

  /**
   * Simula diferentes escenarios de carga
   */
  async simulateScenarios(req, res) {
    try {
      const { baseItems, distance } = req.body;

      if (!baseItems || !distance) {
        return res.status(400).json({
          error: 'Se requieren items base y distancia'
        });
      }

      const scenarios = [];

      // Escenario 1: Configuración actual
      const currentMetrics = loadCalculatorService.calculateLinearMeters(baseItems);
      const currentTransport = loadCalculatorService.determineTransportType(currentMetrics);
      const currentPrice = loadCalculatorService.calculatePrice(
        currentMetrics,
        currentTransport.type,
        distance
      );

      scenarios.push({
        name: 'Configuración Actual',
        items: baseItems,
        metrics: currentMetrics,
        transport: currentTransport,
        price: currentPrice
      });

      // Escenario 2: Optimizado para LTL
      if (currentTransport.type === 'FTL' && currentTransport.utilization.linear < 75) {
        // Sugerir reducir carga para LTL
        const ltlMetrics = { ...currentMetrics };
        const ltlPrice = loadCalculatorService.calculatePrice(ltlMetrics, 'LTL', distance);

        scenarios.push({
          name: 'Optimizado para Grupaje (LTL)',
          suggestion: 'Considere enviar en múltiples entregas o consolidar con otros envíos',
          metrics: ltlMetrics,
          transport: { type: 'LTL', utilization: currentTransport.utilization },
          price: ltlPrice,
          savings: currentPrice.totalPrice - ltlPrice.totalPrice
        });
      }

      // Escenario 3: Optimizado para FTL
      if (currentTransport.type === 'LTL' && currentTransport.utilization.linear > 50) {
        // Sugerir añadir más carga para FTL
        const additionalMeters = 13.6 - currentMetrics.totalLinearMeters;
        const ftlPrice = loadCalculatorService.calculatePrice(
          currentMetrics,
          'FTL',
          distance
        );

        scenarios.push({
          name: 'Optimizado para Camión Completo (FTL)',
          suggestion: `Añada ${additionalMeters.toFixed(2)} metros lineales más para completar el camión`,
          metrics: currentMetrics,
          transport: { type: 'FTL', utilization: currentTransport.utilization },
          price: ftlPrice,
          additionalCapacity: additionalMeters
        });
      }

      res.json({
        success: true,
        scenarios,
        recommendation: scenarios.reduce((best, current) =>
          current.price && current.price.totalPrice < best.price.totalPrice ? current : best
        ).name
      });
    } catch (error) {
      console.error('Error simulando escenarios:', error);
      res.status(500).json({
        error: 'Error al simular escenarios',
        message: error.message
      });
    }
  }
}

module.exports = new LoadCalculatorController();