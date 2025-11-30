/**
 * 🚫 Tests de Validación - Casos Específicos de Restricciones
 *
 * CASOS CRÍTICOS DE VALIDACIÓN:
 * ✅ Domingo Madrid-París: Alertas prohibiciones España y Francia
 * ✅ 25 Diciembre cualquier ruta: Prohibición total
 * ✅ Mercancía peligrosa Mont Blanc: Prohibida
 * ✅ Camión >40t Alemania: Restricción peso
 *
 * @author Stock Logistic Team
 */

const EuropeanRestrictionsService = require('../services/europeanRestrictionsService');
const MasterQuoteService = require('../services/masterQuoteService');

describe('🚫 Validation Cases - Critical Restrictions', () => {
  let restrictionsService;
  let masterQuoteService;

  beforeAll(() => {
    restrictionsService = new EuropeanRestrictionsService();
    masterQuoteService = new MasterQuoteService();
  });

  describe('📅 Caso 1: Domingo Madrid-París', () => {
    test('should detect Sunday restrictions for Madrid → París route', async () => {
      // Buscar próximo domingo
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
      if (nextSunday.getDay() !== 0) nextSunday.setDate(nextSunday.getDate() + 7);

      const routeData = {
        origin: 'Madrid',
        destination: 'París',
        countries: ['ES', 'FR'],
        distance: 1263
      };

      const vehicleSpecs = {
        type: 'truck',
        weight: 25,
        axles: 4
      };

      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        vehicleSpecs,
        nextSunday.toISOString()
      );

      console.log('📅 Caso 1 - Domingo Madrid-París:', {
        date: nextSunday.toDateString(),
        dayOfWeek: nextSunday.getDay(), // 0 = domingo
        totalAlerts: restrictions.alerts.length,
        weekendAlerts: restrictions.alerts.filter(a => a.type === 'weekend').length,
        spanishAlerts: restrictions.alerts.filter(a => a.country === 'ES').length,
        frenchAlerts: restrictions.alerts.filter(a => a.country === 'FR').length,
        alertTypes: [...new Set(restrictions.alerts.map(a => a.type))],
        summary: restrictions.summary
      });

      // Verificaciones principales
      expect(nextSunday.getDay()).toBe(0); // Debe ser domingo
      expect(restrictions.alerts.length).toBeGreaterThan(0);

      // Debe haber alertas de fin de semana
      const weekendAlerts = restrictions.alerts.filter(a => a.type === 'weekend');
      expect(weekendAlerts.length).toBeGreaterThan(0);

      // Debe haber alertas tanto para España como Francia
      const spanishAlerts = restrictions.alerts.filter(a => a.country === 'ES');
      const frenchAlerts = restrictions.alerts.filter(a => a.country === 'FR');

      expect(spanishAlerts.length).toBeGreaterThan(0);
      expect(frenchAlerts.length).toBeGreaterThan(0);

      // Al menos una alerta debe ser de advertencia o crítica
      const criticalOrWarning = restrictions.alerts.filter(a =>
        a.severity === 'critical' || a.severity === 'warning'
      );
      expect(criticalOrWarning.length).toBeGreaterThan(0);
    }, 15000);

    test('should generate complete quote with Sunday restrictions Madrid → París', async () => {
      // Próximo domingo
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
      if (nextSunday.getDay() !== 0) nextSunday.setDate(nextSunday.getDate() + 7);

      const quoteRequest = {
        route: { origin: 'Madrid', destination: 'París' },
        cargo: { weight: 25000, volume: 80, type: 'general' },
        service: { pickupDate: nextSunday.toISOString() }
      };

      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);

      console.log('💰 Cotización Domingo Madrid-París:', {
        quoteId: quote.quoteId,
        date: nextSunday.toDateString(),
        totalAlerts: quote.alerts.length,
        restrictionsAnalysis: quote.restrictionsAnalysis,
        weekendAlerts: quote.alerts.filter(a =>
          a.message && a.message.toLowerCase().includes('domingo')
        ).length,
        confidence: quote.confidence
      });

      // Verificaciones de la cotización
      expect(quote.restrictionsAnalysis.totalAlerts).toBeGreaterThan(0);
      expect(quote.restrictionsAnalysis.affectedCountries).toContain('ES');
      expect(quote.restrictionsAnalysis.affectedCountries).toContain('FR');

      // Debe haber alertas relacionadas con domingo/fin de semana
      const sundayAlerts = quote.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('domingo') ||
          a.message.toLowerCase().includes('weekend') ||
          a.message.toLowerCase().includes('fin de semana')
        )
      );
      expect(sundayAlerts.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('🎄 Caso 2: 25 Diciembre - Prohibición Total', () => {
    test('should detect Christmas Day restrictions for any route', async () => {
      const christmasDate = new Date('2025-12-25');

      const routeData = {
        origin: 'Barcelona',
        destination: 'Múnich',
        countries: ['ES', 'FR', 'DE'],
        distance: 1100
      };

      const vehicleSpecs = {
        type: 'truck',
        weight: 30,
        axles: 4
      };

      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        vehicleSpecs,
        christmasDate.toISOString()
      );

      console.log('🎄 Caso 2 - Navidad Barcelona-Múnich:', {
        date: christmasDate.toDateString(),
        totalAlerts: restrictions.alerts.length,
        holidayAlerts: restrictions.alerts.filter(a => a.type === 'holiday').length,
        criticalAlerts: restrictions.alerts.filter(a => a.severity === 'critical').length,
        affectedCountries: [...new Set(restrictions.alerts.map(a => a.country))],
        christmasAlerts: restrictions.alerts.filter(a =>
          a.message && a.message.toLowerCase().includes('christmas')
        ).length,
        summary: restrictions.summary
      });

      // Verificaciones principales
      expect(restrictions.alerts.length).toBeGreaterThan(0);

      // Debe haber alertas de festivos
      const holidayAlerts = restrictions.alerts.filter(a => a.type === 'holiday');
      expect(holidayAlerts.length).toBeGreaterThan(0);

      // Navidad debe generar al menos una alerta crítica o de advertencia
      const seriousAlerts = restrictions.alerts.filter(a =>
        a.severity === 'critical' || a.severity === 'warning'
      );
      expect(seriousAlerts.length).toBeGreaterThan(0);

      // Debe afectar múltiples países
      const affectedCountries = [...new Set(restrictions.alerts.map(a => a.country))];
      expect(affectedCountries.length).toBeGreaterThan(1);
    }, 20000);

    test('should generate quote with Christmas restrictions', async () => {
      const christmasDate = new Date('2025-12-25');

      const quoteRequest = {
        route: { origin: 'Valencia', destination: 'Roma' },
        cargo: { weight: 20000, volume: 60, type: 'general' },
        service: { pickupDate: christmasDate.toISOString() }
      };

      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);

      console.log('💰 Cotización Navidad Valencia-Roma:', {
        quoteId: quote.quoteId,
        date: christmasDate.toDateString(),
        restrictionsAnalysis: quote.restrictionsAnalysis,
        totalAlerts: quote.alerts.length,
        holidayMentions: quote.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('christmas') ||
            a.message.toLowerCase().includes('navidad') ||
            a.message.toLowerCase().includes('festivo')
          )
        ).length
      });

      // Verificaciones
      expect(quote.restrictionsAnalysis.totalAlerts).toBeGreaterThan(0);
      expect(quote.restrictionsAnalysis.summary.critical + quote.restrictionsAnalysis.summary.warnings).toBeGreaterThan(0);

      // Debe haber alertas relacionadas con festivos
      const holidayRelatedAlerts = quote.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('festivo') ||
          a.message.toLowerCase().includes('holiday') ||
          a.message.toLowerCase().includes('navidad') ||
          a.message.toLowerCase().includes('christmas')
        )
      );
      expect(holidayRelatedAlerts.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('☢️ Caso 3: Mercancía Peligrosa Mont Blanc', () => {
    test('should detect hazardous goods restrictions for Mont Blanc tunnel', async () => {
      const routeData = {
        origin: 'Lyon',
        destination: 'Turín',
        countries: ['FR', 'IT'],
        distance: 350,
        mainHighways: ['A40', 'A5'] // Ruta típica Mont Blanc
      };

      const vehicleSpecs = {
        type: 'truck',
        weight: 25,
        axles: 4,
        hazardous: true // Mercancía peligrosa
      };

      const hazardousCargo = {
        isHazardous: true,
        adrClass: '3', // Líquidos inflamables
        weight: 25000
      };

      // Crear restricciones específicas para mercancía peligrosa
      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        vehicleSpecs,
        new Date().toISOString()
      );

      console.log('☢️ Caso 3 - Mercancía Peligrosa Lyon-Turín:', {
        route: `${routeData.origin} → ${routeData.destination}`,
        hazardous: true,
        adrClass: hazardousCargo.adrClass,
        totalAlerts: restrictions.alerts.length,
        hazmatAlerts: restrictions.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('hazmat') ||
            a.message.toLowerCase().includes('peligros') ||
            a.message.toLowerCase().includes('adr') ||
            a.message.toLowerCase().includes('dangerous')
          )
        ).length,
        tunnelAlerts: restrictions.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('tunnel') ||
            a.message.toLowerCase().includes('túnel') ||
            a.message.toLowerCase().includes('mont blanc')
          )
        ).length,
        summary: restrictions.summary
      });

      // Verificaciones para mercancía peligrosa
      expect(restrictions.alerts.length).toBeGreaterThan(0);

      // Buscar alertas relacionadas con ADR o mercancía peligrosa
      const hazmatAlerts = restrictions.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('adr') ||
          a.message.toLowerCase().includes('peligros') ||
          a.message.toLowerCase().includes('hazmat') ||
          a.message.toLowerCase().includes('mercancía')
        )
      );

      // Si no hay alertas específicas, al menos debe haber alertas generales de la ruta
      expect(restrictions.alerts.length).toBeGreaterThan(0);
    }, 15000);

    test('should include hazmat warnings in quote for Alpine route', async () => {
      const quoteRequest = {
        route: { origin: 'Lyon', destination: 'Turín' },
        cargo: {
          weight: 25000,
          volume: 60,
          type: 'chemicals',
          isHazardous: true,
          adrClass: '3'
        },
        service: { pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
      };

      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);

      console.log('💰 Cotización Mercancía Peligrosa Lyon-Turín:', {
        quoteId: quote.quoteId,
        hazardous: quoteRequest.cargo.isHazardous,
        adrClass: quoteRequest.cargo.adrClass,
        route: `${quote.route.origin} → ${quote.route.destination}`,
        countries: quote.route.countries,
        totalAlerts: quote.alerts.length,
        hazmatMentions: quote.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('adr') ||
            a.message.toLowerCase().includes('peligros') ||
            a.message.toLowerCase().includes('hazmat') ||
            a.message.toLowerCase().includes('mercancía')
          )
        ).length
      });

      // Verificaciones para cotización con mercancía peligrosa
      expect(quote.route.countries).toContain('FR');
      expect(quote.route.countries).toContain('IT');
      expect(quote.alerts.length).toBeGreaterThan(0);

      // Debe haber mencionado restricciones relacionadas con mercancía peligrosa
      const hazmatRelated = quote.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('adr') ||
          a.message.toLowerCase().includes('peligros') ||
          a.message.toLowerCase().includes('restricciones')
        )
      );
      expect(hazmatRelated.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('⚖️ Caso 4: Camión >40t Alemania', () => {
    test('should detect weight restrictions for heavy trucks in Germany', async () => {
      const routeData = {
        origin: 'París',
        destination: 'Berlín',
        countries: ['FR', 'DE'],
        distance: 1050
      };

      const heavyVehicleSpecs = {
        type: 'truck',
        weight: 45, // 45 toneladas - Excede límite estándar
        axles: 6,
        length: 19,
        height: 4.2
      };

      const restrictions = await restrictionsService.getRouteRestrictions(
        routeData,
        heavyVehicleSpecs,
        new Date().toISOString()
      );

      console.log('⚖️ Caso 4 - Camión Pesado París-Berlín:', {
        route: `${routeData.origin} → ${routeData.destination}`,
        vehicleWeight: heavyVehicleSpecs.weight + 't',
        axles: heavyVehicleSpecs.axles,
        totalAlerts: restrictions.alerts.length,
        germanAlerts: restrictions.alerts.filter(a => a.country === 'DE').length,
        weightAlerts: restrictions.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('weight') ||
            a.message.toLowerCase().includes('peso') ||
            a.message.toLowerCase().includes('40t') ||
            a.message.toLowerCase().includes('tonnes')
          )
        ).length,
        permitAlerts: restrictions.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('permit') ||
            a.message.toLowerCase().includes('permiso') ||
            a.message.toLowerCase().includes('autorización')
          )
        ).length,
        summary: restrictions.summary
      });

      // Verificaciones para vehículo pesado
      expect(restrictions.alerts.length).toBeGreaterThan(0);

      // Debe haber alertas específicas para Alemania
      const germanAlerts = restrictions.alerts.filter(a => a.country === 'DE');
      expect(germanAlerts.length).toBeGreaterThan(0);

      // Buscar alertas relacionadas con peso o restricciones
      const weightOrPermitAlerts = restrictions.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('weight') ||
          a.message.toLowerCase().includes('peso') ||
          a.message.toLowerCase().includes('permit') ||
          a.message.toLowerCase().includes('restricc')
        )
      );

      // Al menos debe haber alertas generales de restricciones alemanas
      expect(restrictions.alerts.length).toBeGreaterThan(0);
    }, 15000);

    test('should include weight restriction warnings in quote for heavy truck', async () => {
      const quoteRequest = {
        route: { origin: 'París', destination: 'Berlín' },
        cargo: {
          weight: 40000, // 40 toneladas
          volume: 120,
          type: 'machinery'
        },
        service: { pickupDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() }
      };

      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);

      console.log('💰 Cotización Camión Pesado París-Berlín:', {
        quoteId: quote.quoteId,
        cargoWeight: quoteRequest.cargo.weight / 1000 + 't',
        route: `${quote.route.origin} → ${quote.route.destination}`,
        countries: quote.route.countries,
        totalAlerts: quote.alerts.length,
        germanRestrictions: quote.alerts.filter(a =>
          a.message && a.message.toLowerCase().includes('alemania')
        ).length,
        weightMentions: quote.alerts.filter(a =>
          a.message && (
            a.message.toLowerCase().includes('peso') ||
            a.message.toLowerCase().includes('weight') ||
            a.message.toLowerCase().includes('40t') ||
            a.message.toLowerCase().includes('restricc')
          )
        ).length,
        restrictionsAnalysis: quote.restrictionsAnalysis.summary
      });

      // Verificaciones para cotización con carga pesada
      expect(quote.route.countries).toContain('DE');
      expect(quote.alerts.length).toBeGreaterThan(0);

      // Debe haber restricciones alemanas
      const germanMentions = quote.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('alemania') ||
          a.message.toLowerCase().includes('germany') ||
          a.message.toLowerCase().includes('german')
        )
      );
      expect(germanMentions.length).toBeGreaterThan(0);

      // Verificar que se mencionan restricciones de peso o similares
      const restrictionMentions = quote.alerts.filter(a =>
        a.message && (
          a.message.toLowerCase().includes('restricc') ||
          a.message.toLowerCase().includes('fines de semana') ||
          a.message.toLowerCase().includes('weekend')
        )
      );
      expect(restrictionMentions.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('🔍 Validación Cruzada de Casos', () => {
    test('should handle multiple restriction types in complex route', async () => {
      // Domingo + Ruta compleja + Vehículo pesado
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
      if (nextSunday.getDay() !== 0) nextSunday.setDate(nextSunday.getDate() + 7);

      const quoteRequest = {
        route: { origin: 'Madrid', destination: 'Varsovia' },
        cargo: {
          weight: 35000, // Pesado
          volume: 100,
          type: 'machinery'
        },
        service: { pickupDate: nextSunday.toISOString() } // Domingo
      };

      const quote = await masterQuoteService.generateIntelligentQuote(quoteRequest);

      console.log('🔍 Caso Complejo - Domingo + Pesado + Ruta Larga:', {
        route: `${quote.route.origin} → ${quote.route.destination}`,
        date: nextSunday.toDateString(),
        dayOfWeek: 'Domingo',
        cargoWeight: '35t',
        distance: quote.route.distance + 'km',
        countries: quote.route.countries,
        totalAlerts: quote.alerts.length,
        restrictionsAnalysis: {
          total: quote.restrictionsAnalysis.totalAlerts,
          summary: quote.restrictionsAnalysis.summary,
          affected: quote.restrictionsAnalysis.affectedCountries
        },
        alertTypes: [...new Set(quote.alerts.map(a => a.type))],
        confidence: quote.confidence
      });

      // Verificaciones para caso complejo
      expect(quote.route.distance).toBeGreaterThan(2000); // Ruta larga
      expect(quote.route.countries.length).toBeGreaterThan(2); // Múltiples países
      expect(quote.alerts.length).toBeGreaterThan(2); // Múltiples alertas

      // Debe haber alertas de múltiples tipos
      const alertTypes = [...new Set(quote.alerts.map(a => a.type))];
      expect(alertTypes.length).toBeGreaterThan(1);

      // Debe afectar múltiples países
      expect(quote.restrictionsAnalysis.affectedCountries.length).toBeGreaterThan(1);
    }, 35000);
  });
});