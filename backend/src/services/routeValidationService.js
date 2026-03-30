/**
 * 🗺️ RouteValidationService - Validación y datos de rutas
 * 
 * Proporciona información básica de rutas para el análisis LUC1
 * En producción se integraría con Google Maps API o OpenRoute
 * 
 * @author AXEL Team
 * @version 1.0.0
 */

class RouteValidationService {
  constructor() {
    // Base de datos simplificada de rutas europeas
    this.routeDatabase = {
      // Rutas España-Francia
      'Madrid-París': {
        distance: 1270,
        duration: 18, // horas
        countries: ['ES', 'FR'],
        mainHighways: ['AP-2', 'A-9', 'A-6'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes'],
        borderCrossings: ['La Jonquera'],
        estimatedTransitDays: 2
      },
      
      'Barcelona-París': {
        distance: 833,
        duration: 12,
        countries: ['ES', 'FR'],
        mainHighways: ['AP-2', 'A-9'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes'],
        borderCrossings: ['La Jonquera'],
        estimatedTransitDays: 2
      },

      // Rutas España-Italia
      'Valencia-Roma': {
        distance: 1245,
        duration: 17,
        countries: ['ES', 'FR', 'IT'],
        mainHighways: ['AP-7', 'A-8', 'A-12'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes', 'IT-Autostrade'],
        borderCrossings: ['La Jonquera', 'Ventimiglia'],
        estimatedTransitDays: 2
      },

      'Barcelona-Milán': {
        distance: 725,
        duration: 11,
        countries: ['ES', 'FR', 'IT'],
        mainHighways: ['AP-2', 'A-8', 'A-4'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes', 'IT-Autostrade'],
        borderCrossings: ['La Jonquera', 'Ventimiglia'],
        estimatedTransitDays: 2
      },

      // Rutas España-Alemania
      'Madrid-Berlín': {
        distance: 1870,
        duration: 26,
        countries: ['ES', 'FR', 'DE'],
        mainHighways: ['AP-2', 'A-6', 'A-4'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes'],
        borderCrossings: ['La Jonquera', 'Kehl'],
        estimatedTransitDays: 3
      },

      'Barcelona-Múnich': {
        distance: 1050,
        duration: 15,
        countries: ['ES', 'FR', 'DE'],
        mainHighways: ['AP-2', 'A-6', 'A-8'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes'],
        borderCrossings: ['La Jonquera', 'Kehl'],
        estimatedTransitDays: 2
      },

      // Rutas España-Polonia
      'Madrid-Varsovia': {
        distance: 2447,
        duration: 34,
        countries: ['ES', 'FR', 'DE', 'PL'],
        mainHighways: ['AP-2', 'A-6', 'A-4', 'A-2'],
        tollSections: ['ES-Peajes', 'FR-Autoroutes'],
        borderCrossings: ['La Jonquera', 'Kehl', 'Frankfurt Oder'],
        estimatedTransitDays: 4
      },

      // Rutas internas España
      'Madrid-Barcelona': {
        distance: 625,
        duration: 9,
        countries: ['ES'],
        mainHighways: ['AP-2'],
        tollSections: ['ES-Peajes'],
        borderCrossings: [],
        estimatedTransitDays: 1
      },

      'Madrid-Valencia': {
        distance: 355,
        duration: 5,
        countries: ['ES'],
        mainHighways: ['A-3'],
        tollSections: ['ES-Peajes'],
        borderCrossings: [],
        estimatedTransitDays: 1
      }
    };

    // Restricciones conocidas por país
    this.countryRestrictions = {
      'ES': {
        sundayBan: { start: '08:00', end: '22:00' },
        holidayBan: true,
        maxWeight: 40000, // kg
        requiresCMR: true
      },
      'FR': {
        sundayBan: { start: '00:00', end: '22:00' },
        holidayBan: true,
        maxWeight: 44000,
        requiresCMR: true
      },
      'IT': {
        sundayBan: { start: '07:00', end: '23:00' },
        holidayBan: true,
        maxWeight: 44000,
        requiresCMR: true
      },
      'DE': {
        sundayBan: { start: '00:00', end: '22:00' },
        holidayBan: true,
        maxWeight: 40000,
        requiresCMR: true,
        requiresMaut: true
      },
      'PL': {
        sundayBan: { start: '06:00', end: '22:00' },
        holidayBan: true,
        maxWeight: 40000,
        requiresCMR: true,
        requiresViaToll: true
      }
    };
  }

  /**
   * 🔍 Obtener detalles completos de una ruta
   */
  async getRouteDetails(origin, destination) {
    try {
      const routeKey = `${origin}-${destination}`;
      const reverseKey = `${destination}-${origin}`;
      
      let routeData = this.routeDatabase[routeKey] || this.routeDatabase[reverseKey];
      
      if (!routeData) {
        // Si no existe en la base de datos, calcular estimado
        routeData = this.estimateRoute(origin, destination);
      }

      // Enriquecer con información adicional
      const enrichedData = {
        ...routeData,
        origin,
        destination,
        routeKey,
        complexity: this.calculateRouteComplexity(routeData),
        riskFactors: this.identifyRiskFactors(routeData),
        alternativeRoutes: this.getAlternativeRoutes(origin, destination),
        lastUpdated: new Date().toISOString()
      };

      console.log(`📍 Ruta ${origin} → ${destination}: ${routeData.distance}km, ${routeData.estimatedTransitDays} días`);
      
      return enrichedData;
    } catch (error) {
      console.error('❌ Error obteniendo detalles de ruta:', error);
      return this.getFallbackRoute(origin, destination);
    }
  }

  /**
   * 📏 Estimar ruta no disponible en base de datos
   */
  estimateRoute(origin, destination) {
    // Coordenadas aproximadas de ciudades principales
    const cityCoords = {
      'Madrid': { lat: 40.4168, lon: -3.7038 },
      'Barcelona': { lat: 41.3851, lon: 2.1734 },
      'Valencia': { lat: 39.4699, lon: -0.3763 },
      'Sevilla': { lat: 37.3886, lon: -5.9823 },
      'París': { lat: 48.8566, lon: 2.3522 },
      'Lyon': { lat: 45.7640, lon: 4.8357 },
      'Milán': { lat: 45.4642, lon: 9.1900 },
      'Roma': { lat: 41.9028, lon: 12.4964 },
      'Berlín': { lat: 52.5200, lon: 13.4050 },
      'Múnich': { lat: 48.1351, lon: 11.5820 },
      'Varsovia': { lat: 52.2297, lon: 21.0122 }
    };

    const originCoords = cityCoords[origin];
    const destCoords = cityCoords[destination];

    if (!originCoords || !destCoords) {
      return this.getFallbackRoute(origin, destination);
    }

    // Calcular distancia aproximada (haversine simplificado)
    const distance = this.calculateHaversineDistance(originCoords, destCoords);
    const adjustedDistance = Math.round(distance * 1.25); // Factor carreteras
    
    return {
      distance: adjustedDistance,
      duration: Math.round(adjustedDistance / 65), // 65 km/h promedio
      countries: this.estimateCountries(origin, destination),
      mainHighways: ['Ruta estimada'],
      tollSections: ['Peajes estimados'],
      borderCrossings: [],
      estimatedTransitDays: Math.ceil(adjustedDistance / 650),
      isEstimated: true
    };
  }

  /**
   * 🌍 Calcular distancia haversine
   */
  calculateHaversineDistance(coord1, coord2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 🏃‍♂️ Ruta de fallback
   */
  getFallbackRoute(origin, destination) {
    return {
      distance: 1200,
      duration: 18,
      countries: ['ES', 'FR'],
      mainHighways: ['Ruta desconocida'],
      tollSections: ['Peajes estimados'],
      borderCrossings: ['Frontera estimada'],
      estimatedTransitDays: 2,
      isFallback: true,
      origin,
      destination
    };
  }

  /**
   * 🎯 Calcular complejidad de ruta
   */
  calculateRouteComplexity(routeData) {
    let complexity = 'low';
    
    const factors = {
      countries: routeData.countries?.length || 1,
      distance: routeData.distance || 0,
      borderCrossings: routeData.borderCrossings?.length || 0,
      tollSections: routeData.tollSections?.length || 0
    };

    // Algoritmo de complejidad
    if (factors.countries >= 4 || factors.distance > 2000) {
      complexity = 'high';
    } else if (factors.countries >= 3 || factors.distance > 1000 || factors.borderCrossings >= 2) {
      complexity = 'medium';
    }

    return complexity;
  }

  /**
   * ⚠️ Identificar factores de riesgo
   */
  identifyRiskFactors(routeData) {
    const risks = [];

    if (routeData.countries?.length >= 3) {
      risks.push({
        type: 'multiple_borders',
        severity: 'medium',
        description: 'Múltiples fronteras - documentación CMR crítica'
      });
    }

    if (routeData.distance > 2000) {
      risks.push({
        type: 'long_distance',
        severity: 'medium',
        description: 'Ruta larga - mayor riesgo de retrasos'
      });
    }

    if (routeData.countries?.includes('DE') || routeData.countries?.includes('PL')) {
      risks.push({
        type: 'eastern_corridor',
        severity: 'low',
        description: 'Corredor este - restricciones específicas'
      });
    }

    return risks;
  }

  /**
   * 🔄 Obtener rutas alternativas
   */
  getAlternativeRoutes(origin, destination) {
    // Simular rutas alternativas básicas
    const alternatives = [];

    if (origin.includes('España') && destination.includes('Francia')) {
      alternatives.push({
        name: 'Vía Pirineos Central',
        additionalDistance: 50,
        description: 'Evita peajes principales'
      });
    }

    if (origin.includes('España') && destination.includes('Italia')) {
      alternatives.push({
        name: 'Vía Costa Mediterránea',
        additionalDistance: 80,
        description: 'Ruta costera - mejores vistas'
      });
    }

    return alternatives;
  }

  /**
   * 🌍 Estimar países de tránsito
   */
  estimateCountries(origin, destination) {
    const countryMap = {
      'Madrid': 'ES', 'Barcelona': 'ES', 'Valencia': 'ES', 'Sevilla': 'ES',
      'París': 'FR', 'Lyon': 'FR',
      'Milán': 'IT', 'Roma': 'IT',
      'Berlín': 'DE', 'Múnich': 'DE',
      'Varsovia': 'PL'
    };

    const originCountry = countryMap[origin] || 'ES';
    const destCountry = countryMap[destination] || 'FR';

    if (originCountry === destCountry) {
      return [originCountry];
    }

    // Lógica simplificada de países de tránsito
    const transitLogic = {
      'ES-FR': ['ES', 'FR'],
      'ES-IT': ['ES', 'FR', 'IT'],
      'ES-DE': ['ES', 'FR', 'DE'],
      'ES-PL': ['ES', 'FR', 'DE', 'PL']
    };

    const routeKey = `${originCountry}-${destCountry}`;
    return transitLogic[routeKey] || [originCountry, destCountry];
  }

  /**
   * 📊 Obtener estadísticas de corredor
   */
  getCorridorStats(origin, destination) {
    const routeKey = `${origin}-${destination}`;
    
    return {
      route: routeKey,
      popularity: this.getCorridorPopularity(routeKey),
      averageTransitTime: this.getAverageTransitTime(routeKey),
      seasonalFactors: this.getSeasonalFactors(routeKey),
      lastUpdated: new Date().toISOString()
    };
  }

  getCorridorPopularity(routeKey) {
    const popularRoutes = [
      'Madrid-París', 'Barcelona-Milán', 'Valencia-Roma',
      'Madrid-Barcelona', 'Barcelona-París'
    ];
    
    return popularRoutes.includes(routeKey) ? 'high' : 'medium';
  }

  getAverageTransitTime(routeKey) {
    const route = this.routeDatabase[routeKey];
    return route ? route.estimatedTransitDays : 2;
  }

  getSeasonalFactors(routeKey) {
    const factors = [];
    
    if (routeKey.includes('Múnich') || routeKey.includes('Varsovia')) {
      factors.push('Invierno: posibles restricciones por nieve');
    }
    
    if (routeKey.includes('Francia')) {
      factors.push('Agosto: tráfico intenso por vacaciones');
    }
    
    return factors;
  }

  /**
   * ✅ Validar viabilidad de ruta
   */
  async validateRoute(origin, destination) {
    try {
      const routeData = await this.getRouteDetails(origin, destination);
      
      const validation = {
        isValid: true,
        confidence: routeData.isFallback ? 70 : 95,
        warnings: [],
        recommendations: []
      };

      // Validaciones básicas
      if (routeData.distance > 3000) {
        validation.warnings.push('Ruta muy larga - considerar transporte multimodal');
      }

      if (routeData.countries?.length >= 4) {
        validation.warnings.push('Múltiples países - documentación completa requerida');
      }

      if (routeData.complexity === 'high') {
        validation.recommendations.push('Recomendar servicio premium por complejidad');
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        error: error.message,
        warnings: ['Error validando ruta'],
        recommendations: ['Contactar equipo técnico']
      };
    }
  }
}

module.exports = RouteValidationService;