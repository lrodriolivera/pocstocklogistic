/**
 * 🚫 EuropeanRestrictionsService - Sistema de Restricciones y Regulaciones Europeas
 *
 * FUNCIONES PRINCIPALES:
 * ✅ Monitoreo restricciones de tráfico en tiempo real (DGT España NAP)
 * ✅ Consulta festivos europeos automática
 * ✅ Alertas inteligentes por país y tipo de vehículo
 * ✅ Sistema de cache optimizado para consultas frecuentes
 * ✅ Integración con cotizaciones para alertas automáticas
 *
 * FUENTES DE DATOS:
 * - DGT España NAP: Restricciones tráfico tiempo real
 * - European Holidays API: Festivos todos países UE
 * - Data.Europa.eu: Datasets transporte europeos
 *
 * @author AXEL Team
 * @version 1.0.0
 */

const axios = require('axios');
const xml2js = require('xml2js');
const winston = require('winston');
const crypto = require('crypto');

class EuropeanRestrictionsService {
  constructor() {
    // Endpoints de las APIs
    this.endpoints = {
      dgtNap: process.env.DGT_API_ENDPOINT || 'https://nap-pre.dgt.es/en/dataset',
      holidaysApi: process.env.EUROPEAN_HOLIDAYS_API || 'https://date.nager.at/api/v3',
      dataEuropa: 'https://data.europa.eu/api/hub/search/datasets'
    };

    // Cache para optimizar consultas
    this.cache = {
      restrictions: new Map(),
      holidays: new Map(),
      countryData: new Map()
    };

    // Configuración de TTL (Time To Live) en milisegundos
    this.cacheTtl = {
      restrictions: 360000, // 6 minutos (misma frecuencia que DGT)
      holidays: 86400000,   // 24 horas (festivos no cambian frecuentemente)
      countryData: 3600000  // 1 hora
    };

    // Países europeos soportados
    this.supportedCountries = [
      'ES', 'FR', 'DE', 'IT', 'PT', 'PL', 'NL', 'BE', 'AT', 'CH',
      'CZ', 'SK', 'HU', 'SI', 'HR', 'RO', 'BG', 'GR', 'DK', 'SE',
      'NO', 'FI', 'IE', 'LU', 'EE', 'LV', 'LT', 'CY', 'MT'
    ];

    // Configurar logger específico
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/restrictions.log',
          maxsize: 5000000,
          maxFiles: 3
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    // Métricas del servicio
    this.metrics = {
      dgtRequests: 0,
      holidayRequests: 0,
      cacheHits: 0,
      activerestrictions: 0,
      lastUpdate: null
    };

    console.log('🚫 EuropeanRestrictionsService inicializado correctamente');
  }

  /**
   * 🏥 Health check del servicio
   */
  async healthCheck() {
    try {
      console.log('🏥 Verificando estado de APIs de restricciones...');

      const checks = await Promise.allSettled([
        this.checkDgtApi(),
        this.checkHolidaysApi(),
        this.checkDataEuropaApi()
      ]);

      const health = {
        status: 'operational',
        apis: {
          dgtNap: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason?.message },
          holidaysApi: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason?.message },
          dataEuropa: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', error: checks[2].reason?.message }
        },
        cache: {
          restrictions: this.cache.restrictions.size,
          holidays: this.cache.holidays.size,
          countryData: this.cache.countryData.size
        },
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      };

      this.logger.info('Health check completed', health);
      return health;
    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * 🇪🇸 Verificar API DGT España NAP
   */
  async checkDgtApi() {
    try {
      const response = await axios.get(this.endpoints.dgtNap, {
        timeout: 5000,
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'Axel/1.0'
        }
      });

      return {
        status: 'operational',
        responseTime: response.headers['x-response-time'] || 'N/A',
        format: 'DATEX2/XML',
        lastModified: response.headers['last-modified']
      };
    } catch (error) {
      throw new Error(`DGT API check failed: ${error.message}`);
    }
  }

  /**
   * 🎉 Verificar European Holidays API
   */
  async checkHolidaysApi() {
    try {
      const response = await axios.get(`${this.endpoints.holidaysApi}/AvailableCountries`, {
        timeout: 5000
      });

      return {
        status: 'operational',
        countriesAvailable: response.data.length,
        format: 'JSON',
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      throw new Error(`Holidays API check failed: ${error.message}`);
    }
  }

  /**
   * 🇪🇺 Verificar Data.Europa.eu API
   */
  async checkDataEuropaApi() {
    try {
      const response = await axios.get(this.endpoints.dataEuropa, {
        params: { q: 'transport', limit: 1 },
        timeout: 5000
      });

      return {
        status: 'operational',
        datasetsAvailable: response.data.count || 0,
        format: 'JSON',
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      throw new Error(`Data Europa API check failed: ${error.message}`);
    }
  }

  /**
   * 🚛 Obtener restricciones para una ruta específica
   * @param {Object} routeData - Datos de la ruta
   * @param {Object} vehicleSpecs - Especificaciones del vehículo
   * @param {string} pickupDate - Fecha de recogida
   * @returns {Promise<Object>} Restricciones aplicables
   */
  async getRouteRestrictions(routeData, vehicleSpecs, pickupDate) {
    try {
      console.log(`🚛 Analizando restricciones para ruta: ${routeData.origin} → ${routeData.destination}`);

      const pickupDateObj = new Date(pickupDate);
      const restrictions = {
        route: `${routeData.origin} → ${routeData.destination}`,
        countries: routeData.countries || [],
        vehicleType: vehicleSpecs.type || 'truck',
        date: pickupDate,
        alerts: [],
        summary: {
          critical: 0,
          warnings: 0,
          info: 0
        }
      };

      // Procesar cada país de la ruta
      for (const countryCode of routeData.countries || []) {
        const countryRestrictions = await this.getCountryRestrictions(countryCode, pickupDateObj, vehicleSpecs);
        restrictions.alerts.push(...countryRestrictions.alerts);
      }

      // Calcular resumen
      restrictions.alerts.forEach(alert => {
        restrictions.summary[alert.severity]++;
      });

      // Agregar restricciones específicas por día de la semana
      const weekendRestrictions = this.getWeekendRestrictions(pickupDateObj, routeData.countries);
      restrictions.alerts.push(...weekendRestrictions);

      this.logger.info('Route restrictions analyzed', {
        route: restrictions.route,
        totalAlerts: restrictions.alerts.length,
        summary: restrictions.summary
      });

      return restrictions;
    } catch (error) {
      this.logger.error('Error getting route restrictions', { error: error.message });
      return this.getFallbackRestrictions(routeData, vehicleSpecs, pickupDate);
    }
  }

  /**
   * 🏳️ Obtener restricciones específicas por país
   */
  async getCountryRestrictions(countryCode, date, vehicleSpecs) {
    const cacheKey = `${countryCode}_${date.toDateString()}_${vehicleSpecs.type}`;

    // Verificar cache
    const cached = this.getCachedData('restrictions', cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    const restrictions = {
      country: countryCode,
      alerts: []
    };

    try {
      // Obtener festivos del país
      const holidays = await this.getCountryHolidays(countryCode, date.getFullYear());
      const holidayRestrictions = this.analyzeHolidayRestrictions(holidays, date, countryCode);
      restrictions.alerts.push(...holidayRestrictions);

      // Restricciones específicas por país
      const countrySpecificRestrictions = this.getCountrySpecificRestrictions(countryCode, vehicleSpecs, date);
      restrictions.alerts.push(...countrySpecificRestrictions);

      // Si es España, obtener datos en tiempo real de DGT
      if (countryCode === 'ES') {
        const dgtRestrictions = await this.getDgtRealTimeRestrictions();
        restrictions.alerts.push(...dgtRestrictions);
      }

      // Guardar en cache
      this.setCachedData('restrictions', cacheKey, restrictions);

      return restrictions;
    } catch (error) {
      this.logger.error(`Error getting ${countryCode} restrictions`, { error: error.message });
      // Devolver restricciones básicas como fallback
      restrictions.alerts.push({
        type: 'warning',
        severity: 'info',
        country: countryCode,
        message: `Verificar restricciones locales para ${countryCode}`,
        source: 'fallback'
      });
      return restrictions;
    }
  }

  /**
   * 🎉 Obtener festivos de un país
   */
  async getCountryHolidays(countryCode, year) {
    const cacheKey = `${countryCode}_${year}`;

    // Verificar cache
    const cached = this.getCachedData('holidays', cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    try {
      this.metrics.holidayRequests++;
      const response = await axios.get(`${this.endpoints.holidaysApi}/PublicHolidays/${year}/${countryCode}`, {
        timeout: 5000
      });

      const holidays = response.data.map(holiday => ({
        date: holiday.date,
        name: holiday.name,
        localName: holiday.localName,
        countryCode: holiday.countryCode,
        fixed: holiday.fixed,
        global: holiday.global,
        counties: holiday.counties
      }));

      // Guardar en cache
      this.setCachedData('holidays', cacheKey, holidays);

      this.logger.info(`Retrieved ${holidays.length} holidays for ${countryCode} ${year}`);
      return holidays;
    } catch (error) {
      this.logger.error(`Error getting holidays for ${countryCode}`, { error: error.message });
      return [];
    }
  }

  /**
   * 🇪🇸 Obtener restricciones en tiempo real de DGT España
   */
  async getDgtRealTimeRestrictions() {
    try {
      this.metrics.dgtRequests++;
      console.log('🇪🇸 Consultando restricciones DGT en tiempo real...');

      const response = await axios.get(this.endpoints.dgtNap, {
        timeout: 10000,
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'Axel/1.0'
        }
      });

      // Parsear XML DATEX2
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      const restrictions = [];

      // Procesar situaciones de tráfico del XML DATEX2
      const situations = this.extractTrafficSituations(result);

      situations.forEach(situation => {
        if (this.isRelevantForTrucks(situation)) {
          restrictions.push({
            type: 'traffic',
            severity: this.mapSeverity(situation.severity),
            country: 'ES',
            message: situation.description,
            location: situation.location,
            validFrom: situation.validFrom,
            validTo: situation.validTo,
            source: 'DGT-NAP',
            impact: situation.impact
          });
        }
      });

      this.logger.info(`Retrieved ${restrictions.length} real-time restrictions from DGT`);
      return restrictions;
    } catch (error) {
      this.logger.error('Error getting DGT real-time restrictions', { error: error.message });
      return [];
    }
  }

  /**
   * 📊 Extraer situaciones de tráfico del XML DATEX2
   */
  extractTrafficSituations(xmlData) {
    const situations = [];

    try {
      // Navegar estructura DATEX2 (simplificado)
      const payload = xmlData?.d2LogicalModel?.payloadPublication?.[0];
      if (!payload) return situations;

      const situationRecords = payload.situation || [];

      situationRecords.forEach(record => {
        if (record.situationRecord) {
          record.situationRecord.forEach(situation => {
            situations.push({
              id: situation.$.id,
              version: situation.$.version,
              description: this.extractTextValue(situation.generalPublicComment),
              severity: situation.severity?.[0] || 'medium',
              location: this.extractLocation(situation.groupOfLocations),
              validFrom: situation.validity?.[0]?.validityTimeSpecification?.[0]?.overallStartTime?.[0],
              validTo: situation.validity?.[0]?.validityTimeSpecification?.[0]?.overallEndTime?.[0],
              impact: situation.impact?.[0] || 'unknown'
            });
          });
        }
      });
    } catch (error) {
      this.logger.error('Error extracting traffic situations', { error: error.message });
    }

    return situations;
  }

  /**
   * 🚚 Verificar si una situación es relevante para camiones
   */
  isRelevantForTrucks(situation) {
    const truckKeywords = [
      'truck', 'camión', 'pesado', 'hgv', 'lorry', 'vehicle restriction',
      'weight limit', 'height limit', 'tonnage', 'comercial'
    ];

    const description = (situation.description || '').toLowerCase();
    return truckKeywords.some(keyword => description.includes(keyword));
  }

  /**
   * 📅 Analizar restricciones por festivos (MEJORADO)
   */
  analyzeHolidayRestrictions(holidays, targetDate, countryCode) {
    const restrictions = [];
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Verificar si la fecha objetivo es festivo
    const holiday = holidays.find(h => h.date === targetDateStr);
    if (holiday) {
      // Festivos críticos con prohibición total
      const criticalHolidays = [
        'christmas day', 'navidad', 'christmas',
        'new year', 'año nuevo', "new year's day",
        'easter sunday', 'domingo de pascua'
      ];

      const isCriticalHoliday = criticalHolidays.some(critical =>
        holiday.name.toLowerCase().includes(critical) ||
        holiday.localName?.toLowerCase().includes(critical)
      );

      restrictions.push({
        type: 'holiday',
        severity: isCriticalHoliday ? 'critical' : 'warning',
        country: countryCode,
        message: isCriticalHoliday ?
          `🎄 ${holiday.name} - PROHIBICIÓN TOTAL circulación camiones - CRÍTICO` :
          `${holiday.name} - Posibles restricciones de circulación`,
        date: holiday.date,
        holidayName: holiday.name,
        source: 'holidays-api',
        critical: isCriticalHoliday
      });
    }

    // Verificar festivos en los próximos 3 días
    const threeDaysLater = new Date(targetDate);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      if (holidayDate > targetDate && holidayDate <= threeDaysLater) {
        restrictions.push({
          type: 'upcoming_holiday',
          severity: 'info',
          country: countryCode,
          message: `Próximo festivo: ${holiday.name} (${holiday.date})`,
          date: holiday.date,
          holidayName: holiday.name,
          source: 'holidays-api'
        });
      }
    });

    return restrictions;
  }

  /**
   * 🏳️ Obtener restricciones específicas por país (MEJORADO)
   */
  getCountrySpecificRestrictions(countryCode, vehicleSpecs, date) {
    const restrictions = [];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isSunday = date.getDay() === 0;
    const isSaturday = date.getDay() === 6;
    const isHeavyTruck = vehicleSpecs.weight > 40;
    const isHazardous = vehicleSpecs.hazardous || false;

    // Restricciones específicas por país
    const countryRules = {
      'DE': [
        {
          condition: isSunday,
          type: 'weekend_ban',
          severity: 'critical',
          message: 'Alemania: PROHIBIDA circulación camiones domingos (00:00-22:00) - CRÍTICO'
        },
        {
          condition: isSaturday,
          type: 'weekend_ban',
          severity: 'critical',
          message: 'Alemania: PROHIBIDA circulación camiones sábados (22:00-24:00) - CRÍTICO'
        },
        {
          condition: isHeavyTruck,
          type: 'weight_restriction',
          severity: 'critical',
          message: 'Alemania: Camiones >40t requieren PERMISO ESPECIAL - Verificar autorización'
        },
        {
          condition: isHazardous,
          type: 'hazmat_restriction',
          severity: 'critical',
          message: 'Alemania: Mercancía peligrosa - Restricciones ADR estrictas en autopistas'
        }
      ],
      'FR': [
        {
          condition: isSunday,
          type: 'weekend_ban',
          severity: 'warning',
          message: 'Francia: Restricciones circulación camiones domingos - Verificar rutas específicas'
        },
        {
          condition: vehicleSpecs.weight > 7.5,
          type: 'weight_restriction',
          severity: 'warning',
          message: 'Francia: Restricciones adicionales para vehículos >7.5t en autopistas'
        },
        {
          condition: isHazardous,
          type: 'tunnel_restriction',
          severity: 'critical',
          message: 'Francia: MERCANCÍA PELIGROSA PROHIBIDA en túneles Mont Blanc y Fréjus'
        }
      ],
      'ES': [
        {
          condition: isSunday,
          type: 'weekend_ban',
          severity: 'warning',
          message: 'España: Verificar restricciones circulación camiones domingos en vías específicas'
        },
        {
          condition: isHazardous,
          type: 'hazmat_restriction',
          severity: 'warning',
          message: 'España: Mercancía peligrosa - Documentación ADR obligatoria'
        }
      ],
      'IT': [
        {
          condition: isHazardous,
          type: 'tunnel_restriction',
          severity: 'critical',
          message: 'Italia: PROHIBIDA mercancía peligrosa en túneles alpinos (Mont Blanc, Gran San Bernardo)'
        }
      ],
      'CH': [
        {
          condition: true,
          type: 'vignette',
          severity: 'warning',
          message: 'Suiza: Viñeta obligatoria + restricciones nocturnas túneles'
        },
        {
          condition: isSunday,
          type: 'weekend_ban',
          severity: 'critical',
          message: 'Suiza: PROHIBIDA circulación camiones domingos (00:00-22:00)'
        }
      ],
      'AT': [
        {
          condition: isSunday,
          type: 'weekend_ban',
          severity: 'critical',
          message: 'Austria: PROHIBIDA circulación camiones domingos (00:00-22:00)'
        },
        {
          condition: isSaturday,
          type: 'weekend_ban',
          severity: 'critical',
          message: 'Austria: PROHIBIDA circulación camiones sábados (15:00-24:00)'
        }
      ]
    };

    const rules = countryRules[countryCode] || [];
    rules.forEach(rule => {
      if (rule.condition) {
        restrictions.push({
          ...rule,
          country: countryCode,
          source: 'country-specific-rules'
        });
      }
    });

    return restrictions;
  }

  /**
   * 📅 Obtener restricciones de fin de semana (MEJORADO)
   */
  getWeekendRestrictions(date, countries) {
    const restrictions = [];
    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    countries.forEach(countryCode => {
      if (isSunday) {
        // Restricciones específicas de domingo por país
        const sundayRules = {
          'DE': { severity: 'critical', message: '🚫 ALEMANIA: PROHIBIDA circulación camiones domingos (00:00-22:00)' },
          'AT': { severity: 'critical', message: '🚫 AUSTRIA: PROHIBIDA circulación camiones domingos (00:00-22:00)' },
          'CH': { severity: 'critical', message: '🚫 SUIZA: PROHIBIDA circulación camiones domingos (00:00-22:00)' },
          'FR': { severity: 'warning', message: '⚠️ FRANCIA: Restricciones circulación camiones domingos en ciertas rutas' },
          'ES': { severity: 'warning', message: '⚠️ ESPAÑA: Verificar restricciones domingo en vías específicas' },
          'IT': { severity: 'warning', message: '⚠️ ITALIA: Posibles restricciones domingo en autopistas' }
        };

        const rule = sundayRules[countryCode] || {
          severity: 'info',
          message: `ℹ️ ${countryCode}: Verificar restricciones circulación domingos`
        };

        restrictions.push({
          type: 'weekend',
          severity: rule.severity,
          country: countryCode,
          message: rule.message,
          source: 'weekend-rules',
          dayType: 'sunday'
        });
      } else if (isSaturday) {
        // Restricciones específicas de sábado
        const saturdayRules = {
          'DE': { severity: 'critical', message: '🚫 ALEMANIA: PROHIBIDA circulación camiones sábados (22:00-24:00)' },
          'AT': { severity: 'critical', message: '🚫 AUSTRIA: PROHIBIDA circulación camiones sábados (15:00-24:00)' }
        };

        if (saturdayRules[countryCode]) {
          restrictions.push({
            type: 'weekend',
            severity: saturdayRules[countryCode].severity,
            country: countryCode,
            message: saturdayRules[countryCode].message,
            source: 'weekend-rules',
            dayType: 'saturday'
          });
        }
      }
    });

    return restrictions;
  }

  // ===== FUNCIONES AUXILIARES =====

  /**
   * 💾 Obtener datos del cache
   */
  getCachedData(cacheType, key) {
    const cache = this.cache[cacheType];
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTtl[cacheType]) {
      return cached.data;
    }

    if (cached) {
      cache.delete(key); // Limpiar entrada expirada
    }

    return null;
  }

  /**
   * 💾 Guardar datos en cache
   */
  setCachedData(cacheType, key, data) {
    const cache = this.cache[cacheType];

    // Limpiar cache si está muy grande (máximo 1000 entradas por tipo)
    if (cache.size > 1000) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 🛡️ Restricciones de fallback
   */
  getFallbackRestrictions(routeData, vehicleSpecs, pickupDate) {
    return {
      route: `${routeData.origin} → ${routeData.destination}`,
      countries: routeData.countries || [],
      vehicleType: vehicleSpecs.type || 'truck',
      date: pickupDate,
      alerts: [{
        type: 'warning',
        severity: 'info',
        message: 'Sistema de restricciones temporalmente no disponible - verificar manualmente',
        source: 'fallback'
      }],
      summary: { critical: 0, warnings: 0, info: 1 }
    };
  }

  /**
   * 🗂️ Utilidades para parsear XML
   */
  extractTextValue(textElement) {
    if (!textElement || !textElement[0]) return '';
    return textElement[0].values?.[0]?.value?.[0] || textElement[0] || '';
  }

  extractLocation(locationElement) {
    if (!locationElement || !locationElement[0]) return 'Location not specified';
    // Simplificado - en realidad DATEX2 tiene estructura compleja de localización
    return 'Spain - Location details available in DATEX2';
  }

  mapSeverity(datexSeverity) {
    const severityMap = {
      'highest': 'critical',
      'high': 'critical',
      'medium': 'warning',
      'low': 'info',
      'lowest': 'info'
    };
    return severityMap[datexSeverity] || 'info';
  }

  /**
   * 📊 Obtener métricas del servicio
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheStats: {
        restrictions: this.cache.restrictions.size,
        holidays: this.cache.holidays.size,
        countryData: this.cache.countryData.size
      },
      supportedCountries: this.supportedCountries.length,
      lastUpdate: this.metrics.lastUpdate,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🧹 Limpiar cache expirado
   */
  cleanExpiredCache() {
    let cleaned = 0;

    Object.keys(this.cache).forEach(cacheType => {
      const cache = this.cache[cacheType];
      const ttl = this.cacheTtl[cacheType];

      for (const [key, value] of cache.entries()) {
        if (Date.now() - value.timestamp > ttl) {
          cache.delete(key);
          cleaned++;
        }
      }
    });

    this.logger.info(`Cleaned ${cleaned} expired cache entries`);
    return cleaned;
  }
}

module.exports = EuropeanRestrictionsService;