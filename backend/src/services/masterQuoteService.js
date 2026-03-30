/**
 * 🎯 MasterQuoteService - Orquestador Principal del Sistema
 */

const LUC1Service = require('./luc1Service');
const MultiTransportistService = require('./multiTransportistService');
const RouteValidationService = require('./routeValidationService');
const OpenRouteService = require('./openRouteService');
const TollGuruService = require('./tollGuruService');
const EuropeanRestrictionsService = require('./europeanRestrictionsService');
const Quote = require('../models/Quote');

class MasterQuoteService {
  constructor() {
    this.luc1Service = new LUC1Service();
    this.transportistService = new MultiTransportistService();
    this.routeService = new RouteValidationService();
    this.openRouteService = new OpenRouteService();
    this.tollGuruService = new TollGuruService();
    this.restrictionsService = new EuropeanRestrictionsService();
  }

  async generateIntelligentQuote(quoteRequest) {
    try {
      console.log('🚀 Iniciando cotización inteligente...');
      
      // PASO 1: Calcular ruta real con OpenRoute (HGV) y obtener precios
      const [routeData, transportistPrices] = await Promise.all([
        this.openRouteService.calculateRoute(quoteRequest.route.origin, quoteRequest.route.destination),
        this.transportistService.getAllPrices(quoteRequest)
      ]);

      console.log(`✅ Datos obtenidos: ${transportistPrices.length} precios, ruta ${routeData.distance}km`);

      // PASO 1.5: Calcular peajes exactos con TollGuru usando polyline OpenRoute
      let tollData = null;
      try {
        const vehicleSpecs = this.getVehicleSpecs(quoteRequest.cargo);
        if (routeData.geometry) {
          tollData = await this.tollGuruService.calculateTollsFromPolyline(routeData.geometry, vehicleSpecs);
          console.log(`🛣️ Peajes calculados: €${tollData.tolls.totalCost} (${tollData.tolls.breakdown.length} países)`);
        } else {
          // Si no hay geometry, usar fallback con datos de ruta
          console.log('🔄 Sin geometry disponible, usando fallback con datos de ruta');
          tollData = await this.tollGuruService.calculateFallbackTolls(routeData, vehicleSpecs);
          console.log(`🛣️ Peajes estimados: €${tollData.tolls.totalCost} (${tollData.tolls.breakdown.length} países)`);
        }
      } catch (error) {
        console.warn('⚠️ Error calculando peajes con TollGuru, usando fallback:', error.message);
        // Fallback final si todo falla
        const vehicleSpecs = this.getVehicleSpecs(quoteRequest.cargo);
        tollData = await this.tollGuruService.calculateFallbackTolls(routeData, vehicleSpecs);
      }

      // PASO 2: Analizar restricciones europeas en tiempo real
      const restrictions = await this.restrictionsService.getRouteRestrictions(
        routeData,
        this.getVehicleSpecs(quoteRequest.cargo),
        quoteRequest.service.pickupDate
      );

      // PASO 3: LUC1 analiza todo incluyendo datos exactos de peajes y restricciones completas
      const luc1Analysis = await this.luc1Service.analyzeTransportistPrices({
        transportistPrices,
        routeData,
        tollData: tollData, // Datos exactos de peajes para análisis más preciso
        restrictions: restrictions.alerts || [],
        restrictionsData: restrictions, // Datos completos del EuropeanRestrictionsService
        restrictionsSummary: restrictions.summary || { critical: 0, warnings: 0, info: 0 },
        holidays: restrictions.holidays || [], // Festivos detectados en la ruta
        quoteRequest
      });

      console.log(`🧠 LUC1 recomienda: ${luc1Analysis.recommendedTransportist} por €${luc1Analysis.basePrice}`);

      // PASO 3.5: Ajustar pricing con margen comercial y datos LTL/FTL si disponibles
      const commercialMargin = quoteRequest.preferences.profitMargin || luc1Analysis.suggestedMargin || 15;
      console.log(`💼 Margen comercial aplicado: ${commercialMargin}% (${quoteRequest.preferences.profitMargin ? 'personalizado' : 'sugerido'})`);
      let finalPricing = {
        ...luc1Analysis,
        suggestedMargin: commercialMargin,
        finalPrice: Math.round(luc1Analysis.basePrice * (1 + commercialMargin / 100))
      };

      if (quoteRequest.cargo.transportType && quoteRequest.cargo.linearMeters) {
        const loadCalculatorService = require('./loadCalculatorService');
        const loadMetrics = {
          totalLinearMeters: quoteRequest.cargo.linearMeters,
          totalWeight: quoteRequest.cargo.weight * 1000, // Convertir toneladas a kg
          totalVolume: quoteRequest.cargo.volume,
          loadDetails: quoteRequest.cargo.loadDetails || []
        };

        // Calcular precio específico según LTL/FTL
        const ltlFtlPricing = loadCalculatorService.calculatePrice(
          loadMetrics,
          quoteRequest.cargo.transportType,
          routeData.distance
        );

        console.log(`🚛 Pricing ${quoteRequest.cargo.transportType}: €${ltlFtlPricing.totalPrice} (LUC1: €${luc1Analysis.basePrice})`);

        // Usar el precio específico LTL/FTL como base y el margen del ejecutivo comercial
        finalPricing = {
          ...luc1Analysis,
          basePrice: ltlFtlPricing.totalPrice,
          finalPrice: Math.round(ltlFtlPricing.totalPrice * (1 + commercialMargin / 100)),
          suggestedMargin: commercialMargin,
          ltlFtlDetails: ltlFtlPricing
        };

        console.log(`🎯 Precio ajustado para ${quoteRequest.cargo.transportType}: €${finalPricing.finalPrice}`);
      }

      // PASO 3.8: Calcular programación inteligente de entrega
      const deliverySchedulingService = require('./deliverySchedulingService');

      // Compatibilidad con diferentes estructuras de fecha (pickup.date o service.pickupDate)
      const pickupDate = quoteRequest.pickup?.date || quoteRequest.service?.pickupDate || new Date().toISOString().split('T')[0];

      const deliverySchedule = deliverySchedulingService.calculateDeliverySchedule({
        pickupDate: pickupDate,
        route: routeData,
        serviceType: quoteRequest.preferences.serviceType || 'estandar',
        cargoType: quoteRequest.cargo.type,
        restrictions: restrictions.alerts || [],
        holidays: restrictions.holidays || []
      });

      console.log(`📅 Entrega programada: ${deliverySchedule.delivery.formatted} (${deliverySchedule.transitDays} días de tránsito)`);

      // PASO 4: Generar alternativas basadas en ruta real
      const alternatives = this.generateServiceAlternatives(
        finalPricing,
        routeData,
        pickupDate,  // Usar la variable que ya definimos antes
        quoteRequest.cargo.type,
        restrictions.alerts,
        restrictions.holidays
      );

      // PASO 5: Compilar resultado final
      const quoteResult = {
        quoteId: this.generateQuoteId(),
        timestamp: new Date().toISOString(),
        confidence: finalPricing.confidence,

        route: {
          origin: quoteRequest.route.origin,
          destination: quoteRequest.route.destination,
          distance: routeData.distance,
          estimatedTransitDays: routeData.estimatedTransitDays,
          countries: routeData.countries,
          geometry: routeData.geometry // Geometría completa de la ruta para el mapa
        },

        cargo: {
          type: quoteRequest.cargo.type,
          weight: quoteRequest.cargo.weight,
          volume: quoteRequest.cargo.volume,
          value: quoteRequest.cargo.value,
          description: quoteRequest.cargo.description,
          // Nuevos datos del calculador de metro lineal
          linearMeters: quoteRequest.cargo.linearMeters || null,
          transportType: quoteRequest.cargo.transportType || null,
          utilization: quoteRequest.cargo.utilization || null,
          loadDetails: quoteRequest.cargo.loadDetails || null,
          calculatedFromPallets: quoteRequest.cargo.loadDetails ? true : false,
          calculatedPricing: quoteRequest.cargo.calculatedPricing || null
        },

        costBreakdown: {
          distanceRate: Math.round(finalPricing.basePrice * 0.4),
          fuelCost: Math.round(finalPricing.basePrice * 0.3),
          tollCost: tollData ? Math.round(tollData.tolls.totalCost) : Math.round(finalPricing.basePrice * 0.1),
          tollBreakdown: tollData ? tollData.tolls.breakdown : null,
          tollVignettes: tollData ? tollData.tolls.vignettes : null,
          tollSpecial: tollData ? tollData.tolls.specialTolls : null,
          driverCost: Math.round(finalPricing.basePrice * 0.15),
          vehicleCost: Math.round(finalPricing.basePrice * 0.05),
          subtotal: finalPricing.basePrice,
          adjustmentFactor: 1 + ((finalPricing.suggestedMargin || 15) / 100),
          margin: Math.round(finalPricing.basePrice * (finalPricing.suggestedMargin || 15) / 100),
          totalWithoutVAT: finalPricing.finalPrice,
          vat: Math.round(finalPricing.finalPrice * 0.21),
          total: Math.round(finalPricing.finalPrice * 1.21),
          ltlFtlDetails: finalPricing.ltlFtlDetails || null
        },

        alternatives: alternatives,

        // Programación de entrega inteligente
        schedule: deliverySchedule,

        intelligence: {
          sourcesConsulted: transportistPrices.length,
          recommendedTransportist: finalPricing.recommendedTransportist,
          usedAI: finalPricing.usedAI,
          processingTime: finalPricing.processingTime,
          luc1Reasoning: finalPricing.reasoning,
          luc1RestrictionsImpact: finalPricing.restrictionsImpact,
          luc1RestrictionsRecommendations: finalPricing.restrictionsRecommendations || [],
          ltlFtlUsed: quoteRequest.cargo.transportType || null,
          commercialMargin: commercialMargin,
          marginSource: quoteRequest.preferences.profitMargin ? 'custom' : 'suggested',
          routeSource: routeData.source,
          routeConfidence: routeData.confidence,
          tollSource: tollData ? tollData.source : 'Estimation',
          tollConfidence: tollData ? tollData.confidence : 70,
          restrictionsSource: 'EuropeanRestrictionsService',
          countries: routeData.countries.length
        },

        alerts: [
          ...this.generateRouteAlerts(routeData, quoteRequest),
          ...(finalPricing.alerts || []),
          ...(restrictions.alerts || [])
        ],

        restrictionsAnalysis: {
          totalAlerts: restrictions.alerts.length,
          summary: restrictions.summary,
          criticalRestrictions: restrictions.alerts.filter(a => a.severity === 'critical'),
          affectedCountries: [...new Set(restrictions.alerts.map(a => a.country))],
          source: 'EuropeanRestrictionsService'
        },

        // Additional fields for database storage
        client: quoteRequest.client || {},
        preferences: quoteRequest.preferences || {},
        requirements: quoteRequest.requirements || {},
        pickup: quoteRequest.pickup || {},

        validUntil: this.calculateValidUntil()
      };

      // PASO 6: Guardar cotización en la base de datos
      const savedQuote = await this.saveQuoteToDatabase(quoteResult, {
        tenantId: quoteRequest.tenantId,
        assignedTo: quoteRequest.assignedTo
      });

      // Retornar la instancia de Mongoose guardada (tiene métodos como generateClientAccessToken)
      // Si falla el guardado, retornar el objeto plano como fallback
      return savedQuote || quoteResult;

    } catch (error) {
      console.error('❌ Error generando cotización:', error);
      throw new Error(`Error en cotización inteligente: ${error.message}`);
    }
  }

  generateServiceAlternatives(analysis, routeData, pickupDate, cargoType, restrictions = [], holidays = []) {
    const basePrice = analysis.finalPrice;
    const deliverySchedulingService = require('./deliverySchedulingService');

    const alternatives = [];

    // Generar alternativas para cada tipo de servicio
    ['economico', 'estandar', 'express'].forEach(serviceType => {
      const schedule = deliverySchedulingService.calculateDeliverySchedule({
        pickupDate,
        route: routeData,
        serviceType,
        cargoType,
        restrictions,
        holidays
      });

      const priceMultiplier = {
        economico: 0.85,
        estandar: 1.0,
        express: 1.25
      }[serviceType];

      alternatives.push({
        type: serviceType === 'economico' ? 'Económica' :
              serviceType === 'estandar' ? 'Estándar' : 'Express',
        serviceType,
        price: Math.round(basePrice * priceMultiplier),
        transitTime: schedule.transitDays,
        schedule,
        description: `${schedule.transitDays} días vía ${routeData.countries.join('→')} (${schedule.delivery.window})`,
        features: this.getServiceFeatures(serviceType),
        confidence: schedule.confidence,
        recommended: serviceType === 'estandar'
      });
    });

    return alternatives;
  }

  getServiceFeatures(serviceType) {
    const features = {
      economico: ['Grupaje', 'Flexibilidad fechas', 'Económico', 'Consolidación'],
      estandar: ['Balance precio-tiempo', 'Seguimiento', 'Recomendado', 'Fiabilidad'],
      express: ['Prioridad máxima', 'Seguimiento premium', 'Entrega garantizada', 'Directo']
    };

    return features[serviceType] || [];
  }

  generateQuoteId() {
    const prefix = 'SL';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return `${prefix}-${year}-${random}`;
  }

  generateRouteAlerts(routeData, quoteRequest) {
    const alerts = [];

    // Alertas por complejidad de ruta
    if (routeData.countries.length > 3) {
      alerts.push({
        type: 'warning',
        message: `Ruta compleja: tránsito por ${routeData.countries.length} países`,
        impact: 'medium'
      });
    }

    // Alertas por distancia
    if (routeData.distance > 2000) {
      alerts.push({
        type: 'info',
        message: `Ruta larga: ${routeData.distance}km, considerar conductor de relevo`,
        impact: 'low'
      });
    }

    // Alertas por países específicos
    if (routeData.countries.includes('CH')) {
      alerts.push({
        type: 'warning',
        message: 'Tránsito por Suiza: viñeta y restricciones nocturnas aplicables',
        impact: 'high'
      });
    }

    // Alertas por rutas alpinas
    if (routeData.countries.includes('IT') && routeData.countries.includes('FR')) {
      alerts.push({
        type: 'info',
        message: 'Ruta alpina: túneles Mont Blanc/Fréjus disponibles',
        impact: 'medium'
      });
    }

    // Alertas por países con restricciones conocidas
    if (routeData.countries.includes('DE')) {
      alerts.push({
        type: 'warning',
        message: 'Alemania: Verificar restricciones fines de semana para camiones',
        impact: 'high'
      });
    }

    if (routeData.countries.includes('AT')) {
      alerts.push({
        type: 'warning',
        message: 'Austria: Restricciones circulación sábados tarde y domingos',
        impact: 'high'
      });
    }

    // Alertas por confianza de ruta
    if (routeData.confidence < 80) {
      alerts.push({
        type: 'warning',
        message: 'Ruta calculada con datos limitados - verificar manualmente',
        impact: 'medium'
      });
    }

    return alerts;
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

  /**
   * 🚛 Obtener especificaciones del vehículo para TollGuru basado en la carga
   */
  getVehicleSpecs(cargo) {
    // Configuración por defecto
    let vehicleSpecs = {
      type: 'truck',
      weight: 20, // toneladas
      axles: 3,
      height: 4, // metros
      emissionClass: 'euro6'
    };

    // Ajustar según el tipo de carga
    if (cargo) {
      // Peso del vehículo basado en la carga
      if (cargo.weight) {
        const totalWeight = cargo.weight + 8; // peso del camión vacío ~8t
        if (totalWeight > 30) {
          vehicleSpecs.weight = 40;
          vehicleSpecs.axles = 5;
          vehicleSpecs.height = 4.5;
        } else if (totalWeight > 20) {
          vehicleSpecs.weight = 25;
          vehicleSpecs.axles = 4;
        } else {
          vehicleSpecs.weight = 15;
          vehicleSpecs.axles = 2;
          vehicleSpecs.height = 3.5;
        }
      }

      // Ajustes por tipo de producto
      if (cargo.type === 'forest_products') {
        vehicleSpecs.weight = Math.max(vehicleSpecs.weight, 25);
        vehicleSpecs.axles = Math.max(vehicleSpecs.axles, 4);
        vehicleSpecs.height = 4.5; // Productos forestales pueden ser altos
      }

      // Ajustes por dimensiones específicas
      if (cargo.dimensions && cargo.dimensions.height > 3) {
        vehicleSpecs.height = Math.min(cargo.dimensions.height + 0.5, 4.5);
      }
    }

    return vehicleSpecs;
  }

  /**
   * 💾 Guardar cotización en la base de datos MongoDB
   */
  async saveQuoteToDatabase(quoteResult, { tenantId, assignedTo } = {}) {
    try {
      console.log(`💾 Guardando cotización ${quoteResult.quoteId} en la base de datos...`);

      // Create a new Quote document
      const quote = new Quote({
        tenantId: tenantId || undefined,
        quoteId: quoteResult.quoteId,
        route: quoteResult.route,
        cargo: quoteResult.cargo,
        costBreakdown: quoteResult.costBreakdown,
        alternatives: quoteResult.alternatives,
        schedule: quoteResult.schedule,
        intelligence: quoteResult.intelligence,
        alerts: quoteResult.alerts,
        restrictionsAnalysis: quoteResult.restrictionsAnalysis,
        client: quoteResult.client,
        preferences: quoteResult.preferences,
        requirements: quoteResult.requirements,
        pickup: quoteResult.pickup,
        validUntil: new Date(quoteResult.validUntil),
        confidence: quoteResult.confidence,
        status: 'active',
        createdBy: 'system',
        searchTags: [
          quoteResult.route.origin,
          quoteResult.route.destination,
          quoteResult.cargo.type,
          quoteResult.preferences.serviceType || 'estandar',
          ...(quoteResult.route.countries || []),
          quoteResult.client.company || 'unknown',
          quoteResult.quoteId
        ].filter(Boolean).map(tag => tag.toString().toLowerCase()),

        // Tracking system initialization
        tracking: {
          timeline: [{
            status: 'generated',
            timestamp: new Date(),
            description: 'Cotización generada automáticamente por el sistema',
            performedBy: 'system',
            metadata: {
              processingTime: quoteResult.intelligence?.processingTime || 0,
              aiUsed: quoteResult.intelligence?.usedAI || false,
              confidence: quoteResult.confidence || 0
            }
          }],
          clientAccess: {
            viewCount: 0,
            isActive: false
          },
          communications: [],
          assignedTo: assignedTo || 'system',
          negotiations: []
        }
      });

      // Save to database
      const savedQuote = await quote.save();

      console.log(`✅ Cotización ${quoteResult.quoteId} guardada exitosamente en MongoDB`);
      console.log(`📊 ID de documento: ${savedQuote._id}`);

      return savedQuote;
    } catch (error) {
      console.error(`❌ Error guardando cotización ${quoteResult.quoteId}:`, error);
      // Don't throw error to avoid disrupting quote generation
      // Just log the error and continue
      return null;
    }
  }

  /**
   * 📖 Obtener cotización por ID desde la base de datos
   */
  async getQuoteById(quoteId) {
    try {
      const quote = await Quote.findByQuoteId(quoteId);
      return quote;
    } catch (error) {
      console.error(`❌ Error obteniendo cotización ${quoteId}:`, error);
      throw new Error(`Error recuperando cotización: ${error.message}`);
    }
  }

  /**
   * 📋 Obtener historial de cotizaciones
   */
  async getQuoteHistory(filters = {}) {
    try {
      let query = {};

      // Apply filters
      if (filters.clientEmail) {
        query['client.email'] = filters.clientEmail;
      }
      if (filters.origin) {
        query['route.origin'] = new RegExp(filters.origin, 'i');
      }
      if (filters.destination) {
        query['route.destination'] = new RegExp(filters.destination, 'i');
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.dateFrom) {
        query.createdAt = { $gte: new Date(filters.dateFrom) };
      }
      if (filters.dateTo) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
      }

      const quotes = await Quote.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return quotes;
    } catch (error) {
      console.error('❌ Error obteniendo historial de cotizaciones:', error);
      throw new Error(`Error recuperando historial: ${error.message}`);
    }
  }

  /**
   * 📈 Obtener estadísticas de cotizaciones
   */
  async getQuoteStatistics() {
    try {
      const statistics = await Quote.getQuoteStatistics();
      return statistics;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error calculando estadísticas: ${error.message}`);
    }
  }
}

module.exports = MasterQuoteService;
