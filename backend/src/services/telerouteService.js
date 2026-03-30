/**
 * 🛣️ Teleroute Freight Exchange Service (Alpega Group)
 *
 * Integración con la API REST v2 de Teleroute para:
 * - Búsqueda de ofertas de carga
 * - Búsqueda de vehículos disponibles
 * - Publicación de ofertas de flete
 * - Detalle de ofertas individuales
 *
 * Documentación: https://api-docs.teleroute.com
 * Cobertura: Europa Occidental (ES, FR, BE, NL, LU, DE, IT, PT, CH, AT, GB)
 * Incluye ofertas de Wtransnet y 123cargo.
 *
 * @author AXEL Team
 * @version 2.0.0
 */

const axios = require('axios');

class TelerouteService {
  constructor() {
    this.baseURL = 'https://api.teleroute.com/v2';
    this.credentials = {
      clientId: process.env.TELEROUTE_CLIENT_ID || '',
      clientSecret: process.env.TELEROUTE_CLIENT_SECRET || ''
    };
    this.jwtToken = null;
    this.tokenExpiry = null;
    this.isConfigured = !!(this.credentials.clientId && this.credentials.clientSecret);

    // Cache para ofertas
    this.cache = {
      searches: new Map(),
      offers: new Map()
    };

    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos

    // Países de cobertura principal (Europa Occidental + Alpega network)
    this.coverageCountries = ['ES', 'FR', 'BE', 'NL', 'LU', 'DE', 'IT', 'PT', 'CH', 'AT', 'GB'];

    console.log('🛣️ TelerouteService inicializado');
    console.log(`   Endpoint: ${this.baseURL}`);
    console.log(`   Configurado: ${this.isConfigured ? 'Sí (JWT)' : 'No (modo demo)'}`);
  }

  /**
   * 🔐 Autenticarse con la API de Teleroute (JWT)
   * POST /auth/token con client_id/secret
   */
  async authenticate() {
    // Reutilizar token si no ha expirado
    if (this.jwtToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.jwtToken;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/token`, {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      this.jwtToken = response.data.access_token;
      // Expirar 5 minutos antes para evitar tokens vencidos
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);

      console.log('🔐 Teleroute: JWT obtenido correctamente');
      return this.jwtToken;
    } catch (error) {
      console.error('❌ Error autenticando en Teleroute:', error.message);
      this.jwtToken = null;
      this.tokenExpiry = null;
      throw new Error('Error de autenticación con Teleroute');
    }
  }

  /**
   * 📡 Realizar petición autenticada a la API REST
   */
  async apiRequest(method, path, data = null, queryParams = {}) {
    try {
      const token = await this.authenticate();

      const config = {
        method,
        url: `${this.baseURL}${path}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      };

      if (data) config.data = data;
      if (Object.keys(queryParams).length > 0) config.params = queryParams;

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ Error en petición Teleroute ${method} ${path}:`, error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * 🔍 Buscar ofertas de carga en Teleroute
   * GET /freight/offers con JWT Bearer header
   *
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.originCountry - País de origen
   * @param {string} params.originCity - Ciudad de origen
   * @param {string} params.destinationCountry - País de destino
   * @param {string} params.destinationCity - Ciudad de destino
   * @param {number} params.radiusKm - Radio de búsqueda en km
   * @param {Date} params.fromDate - Fecha desde
   * @param {Date} params.toDate - Fecha hasta
   */
  async searchFreightOffers(params) {
    const cacheKey = JSON.stringify(params);

    // Verificar cache
    if (this.cache.searches.has(cacheKey)) {
      const cached = this.cache.searches.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Teleroute search cache hit');
        return cached.data;
      }
    }

    console.log('🔍 Buscando ofertas en Teleroute:', params);

    // Si no hay credenciales, devolver datos de demostración
    if (!this.isConfigured) {
      console.log('⚠️ Sin credenciales Teleroute, usando datos de demostración');
      return this.getMockFreightOffers(params);
    }

    try {
      const queryParams = {
        origin_country: params.originCountry || 'ES',
        destination_country: params.destinationCountry || '',
        radius: params.radiusKm || 50,
        date_from: this.formatDate(params.fromDate || new Date()),
        date_to: this.formatDate(params.toDate || this.addDays(new Date(), 7)),
        limit: 50
      };

      if (params.originCity) queryParams.origin_city = params.originCity;
      if (params.destinationCity) queryParams.destination_city = params.destinationCity;

      const data = await this.apiRequest('GET', '/freight/offers', null, queryParams);
      const offers = this.parseFreightOffers(data);

      // Guardar en cache
      this.cache.searches.set(cacheKey, {
        data: offers,
        timestamp: Date.now()
      });

      return offers;
    } catch (error) {
      console.error('❌ Error buscando ofertas Teleroute:', error.message);
      // Fallback a datos mock en caso de error
      return this.getMockFreightOffers(params);
    }
  }

  /**
   * 🚚 Buscar ofertas de vehículos disponibles
   * GET /vehicles/offers
   */
  async searchVehicleOffers(params) {
    console.log('🚚 Buscando vehículos en Teleroute:', params);

    if (!this.isConfigured) {
      return this.getMockVehicleOffers(params);
    }

    try {
      const queryParams = {
        country: params.country || 'ES',
        radius: params.radiusKm || 100,
        date_from: this.formatDate(params.fromDate || new Date()),
        date_to: this.formatDate(params.toDate || this.addDays(new Date(), 7)),
        limit: 30
      };

      if (params.city) queryParams.city = params.city;
      if (params.vehicleType) queryParams.vehicle_type = params.vehicleType;

      const data = await this.apiRequest('GET', '/vehicles/offers', null, queryParams);
      return this.parseVehicleOffers(data);
    } catch (error) {
      console.error('❌ Error buscando vehículos Teleroute:', error.message);
      return this.getMockVehicleOffers(params);
    }
  }

  /**
   * 📤 Publicar oferta de carga en Teleroute
   * POST /freight/offers
   */
  async publishFreightOffer(offer) {
    console.log('📤 Publicando oferta en Teleroute:', offer);

    if (!this.isConfigured) {
      console.log('⚠️ Sin credenciales Teleroute, simulando publicación');
      return {
        success: true,
        offerId: `TR-MOCK-${Date.now()}`,
        message: 'Oferta simulada (sin credenciales)',
        platform: 'teleroute',
        offer
      };
    }

    try {
      const payload = {
        loading: {
          country: offer.origin.country,
          city: offer.origin.city,
          postal_code: offer.origin.postalCode || '',
          date: this.formatDate(offer.loadingDate)
        },
        unloading: {
          country: offer.destination.country,
          city: offer.destination.city,
          postal_code: offer.destination.postalCode || '',
          date: this.formatDate(offer.deliveryDate)
        },
        cargo: {
          weight: offer.weight || 0,
          loading_meters: offer.loadingMeters || 0,
          description: offer.description || ''
        },
        vehicle_type: offer.vehicleType || 'tautliner',
        price: {
          amount: offer.price || 0,
          currency: 'EUR'
        }
      };

      const result = await this.apiRequest('POST', '/freight/offers', payload);

      return {
        success: true,
        offerId: result?.id || `TR-${Date.now()}`,
        message: 'Oferta publicada exitosamente en Teleroute',
        platform: 'teleroute',
        offer
      };
    } catch (error) {
      console.error('❌ Error publicando oferta Teleroute:', error.message);
      throw error;
    }
  }

  /**
   * 📄 Obtener detalle de una oferta específica
   * GET /freight/offers/{id}
   */
  async getOfferDetails(offerId) {
    console.log('📄 Obteniendo detalle de oferta Teleroute:', offerId);

    if (!this.isConfigured) {
      return { error: 'Sin credenciales Teleroute', offerId };
    }

    try {
      const data = await this.apiRequest('GET', `/freight/offers/${offerId}`);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo detalle Teleroute:', error.message);
      throw error;
    }
  }

  /**
   * 🔄 Parsear ofertas de carga de la respuesta API
   */
  parseFreightOffers(data) {
    try {
      const offers = data?.offers || data?.results || [];
      if (!offers || !Array.isArray(offers)) return [];

      return offers.map(offer => ({
        id: offer.id || `TR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'teleroute',
        origin: {
          country: offer.loading?.country || '',
          city: offer.loading?.city || '',
          postalCode: offer.loading?.postal_code || '',
          date: offer.loading?.date || ''
        },
        destination: {
          country: offer.unloading?.country || '',
          city: offer.unloading?.city || '',
          postalCode: offer.unloading?.postal_code || '',
          date: offer.unloading?.date || ''
        },
        cargo: {
          weight: parseFloat(offer.cargo?.weight) || 0,
          loadingMeters: parseFloat(offer.cargo?.loading_meters) || 0,
          volume: parseFloat(offer.cargo?.volume) || 0,
          description: offer.cargo?.description || '',
          type: offer.cargo?.type || ''
        },
        vehicleType: offer.vehicle_type || 'TAUTLINER',
        price: {
          amount: parseFloat(offer.price?.amount) || 0,
          currency: offer.price?.currency || 'EUR',
          pricePerKm: parseFloat(offer.price?.price_per_km) || 0
        },
        distance: parseFloat(offer.distance) || 0,
        contact: {
          company: offer.contact?.company || '',
          email: offer.contact?.email || '',
          phone: offer.contact?.phone || '',
          rating: parseFloat(offer.contact?.rating) || 0
        },
        publishedAt: offer.published_at || new Date().toISOString(),
        validUntil: offer.valid_until || ''
      }));
    } catch (error) {
      console.error('Error parseando ofertas Teleroute:', error.message);
      return [];
    }
  }

  /**
   * 🔄 Parsear ofertas de vehículos
   */
  parseVehicleOffers(data) {
    try {
      const vehicles = data?.vehicles || data?.results || [];
      if (!vehicles || !Array.isArray(vehicles)) return [];

      return vehicles.map(v => ({
        id: v.id || `TR-V-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'teleroute',
        type: 'vehicle',
        location: {
          country: v.location?.country || '',
          city: v.location?.city || ''
        },
        destination: {
          country: v.destination?.country || '',
          city: v.destination?.city || ''
        },
        availableFrom: v.available_from || '',
        availableTo: v.available_to || '',
        vehicle: {
          type: v.vehicle_type || 'TAUTLINER',
          capacity: parseFloat(v.capacity) || 0,
          loadingMeters: parseFloat(v.loading_meters) || 13.6
        },
        contact: {
          company: v.contact?.company || '',
          email: v.contact?.email || '',
          phone: v.contact?.phone || '',
          rating: parseFloat(v.contact?.rating) || 0
        }
      }));
    } catch (error) {
      console.error('Error parseando vehículos Teleroute:', error.message);
      return [];
    }
  }

  /**
   * 📋 Datos mock de ofertas de carga
   * Rutas realistas de Europa Occidental vía Teleroute (Alpega Group)
   */
  getMockFreightOffers(params) {
    const today = new Date();

    const allOffers = [
      // Lyon → Barcelona
      {
        id: 'TR-8a3f1b2c',
        source: 'teleroute',
        origin: {
          country: 'FR',
          city: 'Lyon',
          postalCode: '69001',
          date: this.formatDate(today)
        },
        destination: {
          country: 'ES',
          city: 'Barcelona',
          postalCode: '08001',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 12000,
          loadingMeters: 9.5,
          volume: 45,
          description: 'Mercancía general - pallets',
          type: 'general'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 1150,
          currency: 'EUR',
          pricePerKm: 1.92
        },
        distance: 599,
        contact: {
          company: 'Rhône Alpes Transport',
          email: 'fret@ratransport.fr',
          phone: '+33 4 72 XX XX XX',
          rating: 4.6
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Brussels → Madrid
      {
        id: 'TR-4d7e2a9f',
        source: 'teleroute',
        origin: {
          country: 'BE',
          city: 'Brussels',
          postalCode: '1000',
          date: this.formatDate(today)
        },
        destination: {
          country: 'ES',
          city: 'Madrid',
          postalCode: '28001',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 22000,
          loadingMeters: 13.6,
          volume: 80,
          description: 'Productos industriales',
          type: 'industrial'
        },
        vehicleType: 'MEGA_TRAILER',
        price: {
          amount: 1980,
          currency: 'EUR',
          pricePerKm: 1.32
        },
        distance: 1500,
        contact: {
          company: 'Benelux Freight NV',
          email: 'dispatch@beneluxfreight.be',
          phone: '+32 2 XXX XX XX',
          rating: 4.8
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Amsterdam → Lisbon
      {
        id: 'TR-c1b5e8d3',
        source: 'teleroute',
        origin: {
          country: 'NL',
          city: 'Amsterdam',
          postalCode: '1012',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'PT',
          city: 'Lisbon',
          postalCode: '1100',
          date: this.formatDate(this.addDays(today, 4))
        },
        cargo: {
          weight: 18000,
          loadingMeters: 12,
          volume: 65,
          description: 'Bienes de consumo',
          type: 'consumer_goods'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 2450,
          currency: 'EUR',
          pricePerKm: 1.10
        },
        distance: 2230,
        contact: {
          company: 'Holland Logistics BV',
          email: 'planning@hollandlog.nl',
          phone: '+31 20 XXX XXXX',
          rating: 4.5
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Paris → Milan
      {
        id: 'TR-f6a09c47',
        source: 'teleroute',
        origin: {
          country: 'FR',
          city: 'Paris',
          postalCode: '75001',
          date: this.formatDate(today)
        },
        destination: {
          country: 'IT',
          city: 'Milan',
          postalCode: '20121',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 15000,
          loadingMeters: 10,
          volume: 55,
          description: 'Textiles y confección',
          type: 'textiles'
        },
        vehicleType: 'CURTAINSIDE',
        price: {
          amount: 1320,
          currency: 'EUR',
          pricePerKm: 1.54
        },
        distance: 857,
        contact: {
          company: 'Mode Express SARL',
          email: 'transport@modeexpress.fr',
          phone: '+33 1 XX XX XX XX',
          rating: 4.3
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Stuttgart → Valencia
      {
        id: 'TR-92d4b1e8',
        source: 'teleroute',
        origin: {
          country: 'DE',
          city: 'Stuttgart',
          postalCode: '70173',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'ES',
          city: 'Valencia',
          postalCode: '46001',
          date: this.formatDate(this.addDays(today, 3))
        },
        cargo: {
          weight: 8000,
          loadingMeters: 6,
          volume: 30,
          description: 'Productos farmacéuticos - temperatura controlada',
          type: 'pharmaceuticals'
        },
        vehicleType: 'REFRIGERATED',
        price: {
          amount: 1750,
          currency: 'EUR',
          pricePerKm: 1.25
        },
        distance: 1400,
        contact: {
          company: 'Pharma Kühllogistik GmbH',
          email: 'transport@pharmakuhl.de',
          phone: '+49 711 XXX XXXX',
          rating: 4.9
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Porto → Marseille
      {
        id: 'TR-3e7a5f1d',
        source: 'teleroute',
        origin: {
          country: 'PT',
          city: 'Porto',
          postalCode: '4000',
          date: this.formatDate(today)
        },
        destination: {
          country: 'FR',
          city: 'Marseille',
          postalCode: '13001',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 6000,
          loadingMeters: 5,
          volume: 25,
          description: 'Vinos y bebidas',
          type: 'beverages'
        },
        vehicleType: 'BOX_TRUCK',
        price: {
          amount: 980,
          currency: 'EUR',
          pricePerKm: 0.65
        },
        distance: 1510,
        contact: {
          company: 'Douro Wine Transport Lda',
          email: 'logistica@dwtransport.pt',
          phone: '+351 22 XXX XXXX',
          rating: 4.4
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // London → Barcelona
      {
        id: 'TR-b8c2d64a',
        source: 'teleroute',
        origin: {
          country: 'GB',
          city: 'London',
          postalCode: 'EC1A',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'ES',
          city: 'Barcelona',
          postalCode: '08001',
          date: this.formatDate(this.addDays(today, 3))
        },
        cargo: {
          weight: 20000,
          loadingMeters: 13.6,
          volume: 75,
          description: 'Electrónica de consumo',
          type: 'electronics'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 2100,
          currency: 'EUR',
          pricePerKm: 1.40
        },
        distance: 1500,
        contact: {
          company: 'Channel Freight Ltd',
          email: 'bookings@channelfreight.co.uk',
          phone: '+44 20 XXXX XXXX',
          rating: 4.7
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Geneva → Bilbao
      {
        id: 'TR-d5f1a38e',
        source: 'teleroute',
        origin: {
          country: 'CH',
          city: 'Geneva',
          postalCode: '1200',
          date: this.formatDate(today)
        },
        destination: {
          country: 'ES',
          city: 'Bilbao',
          postalCode: '48001',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 24000,
          loadingMeters: 13.6,
          volume: 80,
          description: 'Maquinaria pesada',
          type: 'machinery'
        },
        vehicleType: 'PLATFORM',
        price: {
          amount: 1680,
          currency: 'EUR',
          pricePerKm: 1.55
        },
        distance: 1084,
        contact: {
          company: 'Swiss Heavy Logistics SA',
          email: 'transport@swissheavy.ch',
          phone: '+41 22 XXX XX XX',
          rating: 4.8
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Barcelona → Paris
      {
        id: 'TR-e7c2b4a1',
        source: 'teleroute',
        origin: { country: 'ES', city: 'Barcelona', postalCode: '08001', date: this.formatDate(today) },
        destination: { country: 'FR', city: 'Paris', postalCode: '75001', date: this.formatDate(this.addDays(today, 2)) },
        cargo: { weight: 16000, loadingMeters: 11, volume: 60, description: 'Productos alimentarios envasados', type: 'food' },
        vehicleType: 'TAUTLINER',
        price: { amount: 1420, currency: 'EUR', pricePerKm: 1.38 },
        distance: 1029,
        contact: { company: 'Catalunya Express SL', email: 'flete@catalunyaexpress.es', phone: '+34 93 XXX XX XX', rating: 4.5 },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Madrid → Amsterdam
      {
        id: 'TR-a3f8d192',
        source: 'teleroute',
        origin: { country: 'ES', city: 'Madrid', postalCode: '28001', date: this.formatDate(this.addDays(today, 1)) },
        destination: { country: 'NL', city: 'Amsterdam', postalCode: '1012', date: this.formatDate(this.addDays(today, 3)) },
        cargo: { weight: 20000, loadingMeters: 13.6, volume: 76, description: 'Aceite de oliva - pallets', type: 'food' },
        vehicleType: 'MEGA_TRAILER',
        price: { amount: 2280, currency: 'EUR', pricePerKm: 1.28 },
        distance: 1782,
        contact: { company: 'Iberia Cargo SL', email: 'ops@iberiacargo.es', phone: '+34 91 XXX XX XX', rating: 4.7 },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Valencia → Milan
      {
        id: 'TR-b9e4c7f3',
        source: 'teleroute',
        origin: { country: 'ES', city: 'Valencia', postalCode: '46001', date: this.formatDate(today) },
        destination: { country: 'IT', city: 'Milan', postalCode: '20121', date: this.formatDate(this.addDays(today, 2)) },
        cargo: { weight: 14000, loadingMeters: 10, volume: 50, description: 'Ceramica y azulejos', type: 'construction' },
        vehicleType: 'BOX_TRUCK',
        price: { amount: 1650, currency: 'EUR', pricePerKm: 1.42 },
        distance: 1162,
        contact: { company: 'Levante Transport SL', email: 'trafico@levantetransport.es', phone: '+34 96 XXX XX XX', rating: 4.4 },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Sevilla → Brussels
      {
        id: 'TR-c1d5a8e6',
        source: 'teleroute',
        origin: { country: 'ES', city: 'Sevilla', postalCode: '41001', date: this.formatDate(this.addDays(today, 1)) },
        destination: { country: 'BE', city: 'Brussels', postalCode: '1000', date: this.formatDate(this.addDays(today, 3)) },
        cargo: { weight: 8000, loadingMeters: 7, volume: 35, description: 'Frutas y hortalizas frescas', type: 'perishable' },
        vehicleType: 'REFRIGERATED',
        price: { amount: 2350, currency: 'EUR', pricePerKm: 1.25 },
        distance: 1880,
        contact: { company: 'Frio Sur Express SL', email: 'frio@friosur.es', phone: '+34 95 XXX XX XX', rating: 4.6 },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      }
    ];

    // Filtrar por parámetros
    return allOffers.filter(offer => {
      if (params.originCountry && offer.origin.country !== params.originCountry) return false;
      if (params.destinationCountry && offer.destination.country !== params.destinationCountry) return false;
      if (params.originCity && !offer.origin.city.toLowerCase().includes(params.originCity.toLowerCase())) return false;
      if (params.destinationCity && !offer.destination.city.toLowerCase().includes(params.destinationCity.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * 📋 Datos mock de ofertas de vehículos
   */
  getMockVehicleOffers(params) {
    const today = new Date();

    return [
      {
        id: 'TR-V-001',
        source: 'teleroute',
        type: 'vehicle',
        location: {
          country: params.country || 'FR',
          city: params.city || 'Lyon'
        },
        destination: {
          country: 'ES',
          city: 'Cualquier destino'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 4)),
        vehicle: {
          type: 'TAUTLINER',
          capacity: 24000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Trans Alpine SARL',
          email: 'flotte@transalpine.fr',
          phone: '+33 4 72 XX XX XX',
          rating: 4.5
        }
      },
      {
        id: 'TR-V-002',
        source: 'teleroute',
        type: 'vehicle',
        location: {
          country: 'BE',
          city: 'Antwerp'
        },
        destination: {
          country: 'ES',
          city: 'Península Ibérica'
        },
        availableFrom: this.formatDate(this.addDays(today, 1)),
        availableTo: this.formatDate(this.addDays(today, 6)),
        vehicle: {
          type: 'MEGA_TRAILER',
          capacity: 25000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Flanders Trucking NV',
          email: 'dispatch@flanderstrucking.be',
          phone: '+32 3 XXX XX XX',
          rating: 4.7
        }
      },
      {
        id: 'TR-V-003',
        source: 'teleroute',
        type: 'vehicle',
        location: {
          country: 'NL',
          city: 'Rotterdam'
        },
        destination: {
          country: 'IT',
          city: 'Norte de Italia'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 3)),
        vehicle: {
          type: 'REFRIGERATED',
          capacity: 20000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Cool Chain BV',
          email: 'planning@coolchain.nl',
          phone: '+31 10 XXX XXXX',
          rating: 4.6
        }
      },
      {
        id: 'TR-V-004',
        source: 'teleroute',
        type: 'vehicle',
        location: {
          country: 'DE',
          city: 'Frankfurt'
        },
        destination: {
          country: 'FR',
          city: 'Francia sur'
        },
        availableFrom: this.formatDate(this.addDays(today, 2)),
        availableTo: this.formatDate(this.addDays(today, 8)),
        vehicle: {
          type: 'PLATFORM',
          capacity: 26000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Rhein-Main Spedition GmbH',
          email: 'fuhrpark@rmspedition.de',
          phone: '+49 69 XXX XXXX',
          rating: 4.4
        }
      }
    ];
  }

  /**
   * 🌐 Obtener información de cobertura del servicio
   */
  getCoverage() {
    return {
      mainCountries: this.coverageCountries,
      description: 'Bolsa de cargas de Europa Occidental (Alpega Group). Incluye ofertas de Wtransnet y 123cargo.',
      strengths: [
        'Francia - España',
        'Benelux - Península Ibérica',
        'Alemania - España/Italia',
        'Reino Unido - Europa continental',
        'Suiza - Europa Occidental',
        'Rutas transalpinas'
      ]
    };
  }

  /**
   * ⚠️ Manejar errores de la API
   */
  handleApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        this.jwtToken = null;
        this.tokenExpiry = null;
        return new Error('Credenciales Teleroute inválidas o token expirado');
      } else if (status === 403) {
        return new Error('Acceso denegado a Teleroute API');
      } else if (status === 429) {
        return new Error('Límite de peticiones excedido en Teleroute');
      } else if (status === 500) {
        return new Error('Error interno del servidor Teleroute');
      }

      return new Error(`Error Teleroute: ${status} - ${JSON.stringify(data)}`);
    }

    return error;
  }

  /**
   * 📅 Formatear fecha
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * 📅 Añadir días a una fecha
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 🏥 Health check del servicio
   */
  async healthCheck() {
    return {
      service: 'Teleroute',
      group: 'Alpega',
      status: this.isConfigured ? 'configured' : 'demo_mode',
      endpoint: this.baseURL,
      authenticated: !!(this.jwtToken && this.tokenExpiry && Date.now() < this.tokenExpiry),
      includesWtransnet: true,
      coverage: this.coverageCountries,
      cache: {
        searches: this.cache.searches.size,
        offers: this.cache.offers.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TelerouteService;
