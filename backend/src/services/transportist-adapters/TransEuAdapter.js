/**
 * 🌐 TransEuAdapter - Adaptador para API de TRANS.EU
 *
 * Integración con la API de Trans.eu (Central/Eastern European freight exchange)
 * Documentación: https://api.trans.eu/documentation
 *
 * @author AXEL Team
 * @version 1.0.0
 */

const BaseTransportistAdapter = require('./BaseTransportistAdapter');

class TransEuAdapter extends BaseTransportistAdapter {
  constructor(config) {
    super('TRANS.EU', {
      baseURL: config.baseURL || process.env.TRANSEU_BASE_URL || 'https://api.trans.eu',
      apiKey: config.apiKey || process.env.TRANSEU_API_KEY,
      companyId: config.companyId || process.env.TRANSEU_COMPANY_ID,
      timeout: 35000
    });

    this.validateConfig();
  }

  /**
   * 🏥 Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/system/status');
      return response.data.operational === true;
    } catch (error) {
      console.warn('⚠️ TRANS.EU health check unavailable');
      return true;
    }
  }

  /**
   * 💰 Obtener cotización
   */
  async getQuote(quoteRequest) {
    try {
      console.log(`🔍 ${this.name}: Requesting quote...`);

      const transEuRequest = this.transformRequest(quoteRequest);

      const response = await this.withRetry(async () => {
        return await this.client.post('/quotes/calculate', transEuRequest, {
          metadata: { startTime: Date.now() }
        });
      });

      const standardQuote = this.transformResponse(response.data, quoteRequest);

      console.log(`✅ ${this.name}: Quote received - €${standardQuote.price}`);

      return standardQuote;

    } catch (error) {
      console.error(`❌ ${this.name} quote failed:`, error.message);
      return null;
    }
  }

  /**
   * 📝 Transformar request
   */
  transformRequest(quoteRequest) {
    const { route, cargo, service } = quoteRequest;

    return {
      route: {
        from: {
          city: this.extractCity(route.origin),
          country: this.extractCountryCode(route.origin)
        },
        to: {
          city: this.extractCity(route.destination),
          country: this.extractCountryCode(route.destination)
        }
      },
      load: {
        weight_kg: cargo.weight * 1000,
        volume_m3: cargo.volume || (cargo.weight * 1.5),
        type: this.mapLoadType(cargo.type),
        adr: cargo.isHazardous || false
      },
      dates: {
        loading_date: service.pickupDate || service.deliveryDate,
        unloading_date: service.deliveryDate
      },
      vehicle: {
        type: 'TRUCK_TARPAULIN',
        length_m: cargo.length || 13.6
      },
      company_id: this.config.companyId
    };
  }

  /**
   * 📊 Transformar response
   */
  transformResponse(apiResponse, originalRequest) {
    // Trans.eu puede retornar múltiples ofertas
    const offers = apiResponse.offers || [apiResponse];
    const bestOffer = this.selectBestOffer(offers);

    return {
      source: 'transeu',
      sourceName: 'Trans.eu',
      price: Math.round(bestOffer.price || bestOffer.price_eur),
      currency: 'EUR',
      confidence: 85,
      responseTime: apiResponse.response_time || 0,
      metadata: {
        serviceLevel: 'Estándar',
        availableCarriers: offers.length,
        estimatedDays: bestOffer.transit_days || this.estimateTransitDays(originalRequest),
        coverage: 'europa_central',
        isPremium: false,
        offerId: bestOffer.offer_id || `TE-${Date.now()}`,
        validUntil: bestOffer.valid_until || this.getValidUntil(),
        vehicleType: bestOffer.vehicle_type || 'TRUCK_TARPAULIN',
        alternativeOffers: offers.length - 1,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * 🎯 Seleccionar mejor oferta
   */
  selectBestOffer(offers) {
    if (!offers || offers.length === 0) {
      throw new Error('No offers available');
    }

    // Ordenar por precio y seleccionar la mejor
    return offers.sort((a, b) => {
      const priceA = a.price || a.price_eur;
      const priceB = b.price || b.price_eur;
      return priceA - priceB;
    })[0];
  }

  /**
   * 🗺️ Mapear tipo de carga
   */
  mapLoadType(axelType) {
    const mapping = {
      'forestales': 'TIMBER',
      'forest_products': 'TIMBER',
      'general': 'GENERAL',
      'adr': 'ADR',
      'refrigerados': 'REFRIGERATED'
    };

    return mapping[axelType] || 'GENERAL';
  }

  /**
   * 🏙️ Extraer ciudad de dirección
   */
  extractCity(address) {
    // Extraer ciudad (primera palabra antes de la coma)
    const parts = address.split(',');
    return parts[0].trim();
  }

  /**
   * 🌍 Extraer código de país
   */
  extractCountryCode(address) {
    const countryMapping = {
      'Spain': 'ES', 'España': 'ES',
      'France': 'FR', 'Francia': 'FR',
      'Germany': 'DE', 'Alemania': 'DE',
      'Italy': 'IT', 'Italia': 'IT',
      'Portugal': 'PT',
      'Poland': 'PL', 'Polonia': 'PL',
      'Czech Republic': 'CZ'
    };

    for (const [country, code] of Object.entries(countryMapping)) {
      if (address.includes(country)) {
        return code;
      }
    }

    return 'ES';
  }

  /**
   * 📅 Estimar días de tránsito
   */
  estimateTransitDays(request) {
    const distance = request.route.distance || 1000;
    return Math.max(2, Math.ceil(distance / 600)); // Más conservador
  }

  /**
   * ⏰ Fecha de validez
   */
  getValidUntil() {
    const validDate = new Date();
    validDate.setHours(validDate.getHours() + 24); // Válido 24 horas
    return validDate.toISOString();
  }
}

module.exports = TransEuAdapter;