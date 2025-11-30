/**
 * Servicio de Planificación de Entrega Inteligente
 * Calcula fechas de entrega basado en múltiples factores logísticos
 */

class DeliverySchedulingService {
  constructor() {
    // Factores base de tiempo de tránsito por distancia
    this.transitTimeFactors = {
      // km/día según tipo de servicio
      economico: {
        baseSpeed: 400,  // km por día
        description: 'Velocidad económica con paradas de consolidación'
      },
      estandar: {
        baseSpeed: 600,  // km por día
        description: 'Velocidad estándar balanceada'
      },
      express: {
        baseSpeed: 800,  // km por día
        description: 'Velocidad express con prioridad'
      }
    };

    // Factores adicionales según tipo de carga
    this.cargoFactors = {
      general: { delayFactor: 1.0, description: 'Sin demoras adicionales' },
      forestales: { delayFactor: 1.1, description: 'Posibles inspecciones adicionales' },
      adr: { delayFactor: 1.3, description: 'Documentación ADR y rutas específicas' },
      refrigerado: { delayFactor: 1.15, description: 'Verificaciones de temperatura' },
      especial: { delayFactor: 1.25, description: 'Permisos y planificación especial' }
    };

    // Factores por países (complejidad fronteriza)
    this.countryFactors = {
      'ES': { factor: 1.0, name: 'España' },
      'FR': { factor: 1.05, name: 'Francia' },
      'DE': { factor: 1.1, name: 'Alemania' },
      'IT': { factor: 1.15, name: 'Italia' },
      'PL': { factor: 1.2, name: 'Polonia' },
      'NL': { factor: 1.05, name: 'Países Bajos' },
      'BE': { factor: 1.05, name: 'Bélgica' },
      'AT': { factor: 1.1, name: 'Austria' },
      'CH': { factor: 1.25, name: 'Suiza' },
      'GB': { factor: 1.3, name: 'Reino Unido' }
    };
  }

  /**
   * Calcula la fecha de entrega estimada
   * @param {Object} params - Parámetros de cálculo
   * @returns {Object} Información completa de programación
   */
  calculateDeliverySchedule(params) {
    const {
      pickupDate,
      route,
      serviceType = 'estandar',
      cargoType = 'general',
      restrictions = [],
      holidays = []
    } = params;

    console.log(`📅 Calculando programación de entrega desde ${pickupDate}`);

    // PASO 1: Cálculo base de tiempo de tránsito
    const baseTransitDays = this.calculateBaseTransitTime(route, serviceType);
    console.log(`⏱️ Tiempo base de tránsito: ${baseTransitDays} días (${serviceType})`);

    // PASO 2: Aplicar factores de carga
    const cargoAdjustment = this.applyCargoFactors(baseTransitDays, cargoType);
    console.log(`📦 Ajuste por tipo de carga ${cargoType}: +${(cargoAdjustment - baseTransitDays).toFixed(1)} días`);

    // PASO 3: Factores de países fronterizos
    const countryAdjustment = this.applyCountryFactors(cargoAdjustment, route.countries);
    console.log(`🌍 Ajuste por países (${route.countries.join('→')}): +${(countryAdjustment - cargoAdjustment).toFixed(1)} días`);

    // PASO 4: Análisis de restricciones temporales
    const restrictionAdjustment = this.analyzeTemporalRestrictions(
      countryAdjustment,
      restrictions,
      route.countries
    );

    // PASO 5: Consideración de festivos
    const finalTransitDays = this.considerHolidays(
      restrictionAdjustment,
      holidays,
      pickupDate
    );

    // PASO 6: Calcular fechas finales
    const schedule = this.calculateFinalDates(pickupDate, finalTransitDays, serviceType);

    return {
      ...schedule,
      analysis: {
        baseTransitDays: Math.round(baseTransitDays * 10) / 10,
        cargoAdjustment: Math.round((cargoAdjustment - baseTransitDays) * 10) / 10,
        countryAdjustment: Math.round((countryAdjustment - cargoAdjustment) * 10) / 10,
        restrictionAdjustment: Math.round((restrictionAdjustment - countryAdjustment) * 10) / 10,
        holidayAdjustment: Math.round((finalTransitDays - restrictionAdjustment) * 10) / 10,
        totalTransitDays: Math.round(finalTransitDays * 10) / 10,
        factors: {
          serviceType: this.transitTimeFactors[serviceType].description,
          cargoType: this.cargoFactors[cargoType].description,
          countries: route.countries.map(c => this.countryFactors[c]?.name || c).join(' → '),
          restrictionsImpact: restrictions.length,
          holidaysImpact: holidays.length
        }
      }
    };
  }

  calculateBaseTransitTime(route, serviceType) {
    const speedData = this.transitTimeFactors[serviceType];
    const baseTimeHours = route.distance / (speedData.baseSpeed / 24); // Convertir a horas
    return baseTimeHours / 24; // Convertir a días
  }

  applyCargoFactors(baseTime, cargoType) {
    const factor = this.cargoFactors[cargoType]?.delayFactor || 1.0;
    return baseTime * factor;
  }

  applyCountryFactors(adjustedTime, countries) {
    if (!countries || countries.length <= 1) return adjustedTime;

    // Calcular factor promedio de complejidad
    const avgCountryFactor = countries.reduce((sum, countryCode) => {
      return sum + (this.countryFactors[countryCode]?.factor || 1.0);
    }, 0) / countries.length;

    // Factor adicional por cruces fronterizos
    const borderCrossings = countries.length - 1;
    const borderFactor = 1 + (borderCrossings * 0.05); // 5% adicional por frontera

    return adjustedTime * avgCountryFactor * borderFactor;
  }

  analyzeTemporalRestrictions(adjustedTime, restrictions, countries) {
    let additionalTime = 0;

    restrictions.forEach(restriction => {
      switch (restriction.type) {
        case 'weekend_ban':
          additionalTime += 0.5; // Medio día adicional por restricciones de fin de semana
          break;
        case 'night_ban':
          additionalTime += 0.25; // Planificación nocturna más compleja
          break;
        case 'holiday_ban':
          additionalTime += 0.3; // Retrasos por festivos
          break;
        case 'route_restriction':
          additionalTime += 0.4; // Rutas alternativas más largas
          break;
        case 'weight_restriction':
          additionalTime += 0.2; // Posibles controles adicionales
          break;
        default:
          additionalTime += 0.1; // Factor genérico para otras restricciones
      }
    });

    console.log(`🚫 Impacto de restricciones: +${additionalTime.toFixed(1)} días (${restrictions.length} restricciones)`);
    return adjustedTime + additionalTime;
  }

  considerHolidays(adjustedTime, holidays, pickupDate) {
    if (!holidays || holidays.length === 0) return adjustedTime;

    // Analizar si hay festivos en el período de transporte
    const pickup = new Date(pickupDate);
    const estimatedDelivery = new Date(pickup);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.ceil(adjustedTime));

    let holidayDelay = 0;
    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      if (holidayDate >= pickup && holidayDate <= estimatedDelivery) {
        holidayDelay += holiday.impact || 0.5; // Por defecto, medio día de retraso por festivo
      }
    });

    if (holidayDelay > 0) {
      console.log(`🎉 Impacto de festivos: +${holidayDelay} días`);
    }

    return adjustedTime + holidayDelay;
  }

  calculateFinalDates(pickupDate, transitDays, serviceType) {
    const pickup = new Date(pickupDate);

    // Fecha de entrega estimada
    const estimatedDelivery = new Date(pickup);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.ceil(transitDays));

    // Ventana de entrega (más amplia para servicios económicos)
    const windowSize = {
      economico: 2,  // ±2 días
      estandar: 1,   // ±1 día
      express: 0.5   // ±12 horas
    }[serviceType];

    const earliestDelivery = new Date(estimatedDelivery);
    earliestDelivery.setDate(earliestDelivery.getDate() - Math.floor(windowSize));

    const latestDelivery = new Date(estimatedDelivery);
    latestDelivery.setDate(latestDelivery.getDate() + Math.ceil(windowSize));

    return {
      pickup: {
        date: pickup.toISOString(),
        weekday: pickup.toLocaleDateString('es-ES', { weekday: 'long' }),
        formatted: pickup.toLocaleDateString('es-ES')
      },
      delivery: {
        estimated: estimatedDelivery.toISOString(),
        earliest: earliestDelivery.toISOString(),
        latest: latestDelivery.toISOString(),
        weekday: estimatedDelivery.toLocaleDateString('es-ES', { weekday: 'long' }),
        formatted: estimatedDelivery.toLocaleDateString('es-ES'),
        window: `${earliestDelivery.toLocaleDateString('es-ES')} - ${latestDelivery.toLocaleDateString('es-ES')}`
      },
      transitDays: Math.ceil(transitDays),
      businessDays: this.calculateBusinessDays(pickup, estimatedDelivery),
      confidence: this.calculateConfidence(serviceType, transitDays)
    };
  }

  calculateBusinessDays(startDate, endDate) {
    let businessDays = 0;
    const current = new Date(startDate);

    while (current < endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingo (0) ni sábado (6)
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return businessDays;
  }

  calculateConfidence(serviceType, transitDays) {
    // Base de confianza según tipo de servicio
    const baseConfidence = {
      economico: 75,
      estandar: 85,
      express: 95
    }[serviceType];

    // Reducir confianza para tránsitos muy largos
    const distancePenalty = Math.max(0, (transitDays - 5) * 2);

    return Math.max(60, baseConfidence - distancePenalty);
  }

  /**
   * Genera alternativas de fechas para diferentes tipos de servicio
   */
  generateServiceAlternatives(baseParams) {
    const alternatives = [];

    Object.keys(this.transitTimeFactors).forEach(serviceType => {
      const schedule = this.calculateDeliverySchedule({
        ...baseParams,
        serviceType
      });

      alternatives.push({
        serviceType,
        ...schedule,
        description: this.transitTimeFactors[serviceType].description
      });
    });

    return alternatives;
  }
}

module.exports = new DeliverySchedulingService();