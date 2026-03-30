/**
 * 🚂 Trans.eu Platform Freight Exchange Service
 *
 * Integración con la API REST de Trans.eu para:
 * - Búsqueda de ofertas de carga
 * - Búsqueda de vehículos disponibles
 * - Publicación de ofertas de flete
 * - Estado de ofertas publicadas
 *
 * Documentación: https://api.platform.trans.eu
 * Cobertura: Europa Central y del Este (PL, DE, CZ, SK, HU, RO, BG, LT, LV, EE, AT, DK, SE)
 *
 * @author AXEL Team
 * @version 2.0.0
 */

const axios = require('axios');

class TranseuService {
  constructor() {
    this.baseURL = 'https://api.platform.trans.eu';
    this.credentials = {
      clientId: process.env.TRANSEU_CLIENT_ID || '',
      clientSecret: process.env.TRANSEU_CLIENT_SECRET || '',
      apiKey: process.env.TRANSEU_API_KEY || ''
    };
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isConfigured = !!(this.credentials.apiKey);

    // Cache para ofertas
    this.cache = {
      searches: new Map(),
      offers: new Map()
    };

    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos

    // Países de cobertura principal (Europa Central y del Este)
    this.coverageCountries = ['PL', 'DE', 'CZ', 'SK', 'HU', 'RO', 'BG', 'LT', 'LV', 'EE', 'AT', 'DK', 'SE'];

    console.log('🚂 TranseuService inicializado');
    console.log(`   Endpoint: ${this.baseURL}`);
    console.log(`   Configurado: ${this.isConfigured ? 'Sí (Bearer + API-Key)' : 'No (modo demo)'}`);
  }

  /**
   * 🔐 Autenticarse con la API de Trans.eu (OAuth2 client_credentials)
   */
  async authenticate() {
    // Reutilizar token si no ha expirado
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      this.accessToken = response.data.access_token;
      // Expirar 5 minutos antes para evitar tokens vencidos
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);

      console.log('🔐 Trans.eu: Access token obtenido correctamente');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error autenticando en Trans.eu:', error.message);
      this.accessToken = null;
      this.tokenExpiry = null;
      throw new Error('Error de autenticación con Trans.eu');
    }
  }

  /**
   * 📡 Realizar petición autenticada a la API REST
   * Envía Bearer token + API-Key en headers
   */
  async apiRequest(method, path, data = null, queryParams = {}) {
    try {
      const token = await this.authenticate();

      const config = {
        method,
        url: `${this.baseURL}${path}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Api-Key': this.credentials.apiKey,
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
      console.error(`❌ Error en petición Trans.eu ${method} ${path}:`, error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * 🔍 Buscar ofertas de carga en Trans.eu
   * GET /freights con Bearer + API-key headers
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
        console.log('📦 Trans.eu search cache hit');
        return cached.data;
      }
    }

    console.log('🔍 Buscando ofertas en Trans.eu:', params);

    // Si no hay credenciales, devolver datos de demostración
    if (!this.isConfigured) {
      console.log('⚠️ Sin credenciales Trans.eu, usando datos de demostración');
      return this.getMockFreightOffers(params);
    }

    try {
      const queryParams = {
        origin_country: params.originCountry || 'PL',
        destination_country: params.destinationCountry || '',
        radius: params.radiusKm || 50,
        date_from: this.formatDate(params.fromDate || new Date()),
        date_to: this.formatDate(params.toDate || this.addDays(new Date(), 7)),
        limit: 50
      };

      if (params.originCity) queryParams.origin_city = params.originCity;
      if (params.destinationCity) queryParams.destination_city = params.destinationCity;

      const data = await this.apiRequest('GET', '/freights', null, queryParams);
      const offers = this.parseFreightOffers(data);

      // Guardar en cache
      this.cache.searches.set(cacheKey, {
        data: offers,
        timestamp: Date.now()
      });

      return offers;
    } catch (error) {
      console.error('❌ Error buscando ofertas Trans.eu:', error.message);
      // Fallback a datos mock en caso de error
      return this.getMockFreightOffers(params);
    }
  }

  /**
   * 🚚 Buscar ofertas de vehículos disponibles
   * GET /vehicles
   */
  async searchVehicleOffers(params) {
    console.log('🚚 Buscando vehículos en Trans.eu:', params);

    if (!this.isConfigured) {
      return this.getMockVehicleOffers(params);
    }

    try {
      const queryParams = {
        country: params.country || 'PL',
        radius: params.radiusKm || 100,
        date_from: this.formatDate(params.fromDate || new Date()),
        date_to: this.formatDate(params.toDate || this.addDays(new Date(), 7)),
        limit: 30
      };

      if (params.city) queryParams.city = params.city;
      if (params.vehicleType) queryParams.vehicle_type = params.vehicleType;

      const data = await this.apiRequest('GET', '/vehicles', null, queryParams);
      return this.parseVehicleOffers(data);
    } catch (error) {
      console.error('❌ Error buscando vehículos Trans.eu:', error.message);
      return this.getMockVehicleOffers(params);
    }
  }

  /**
   * 📤 Publicar oferta de carga en Trans.eu
   * POST /freights
   */
  async publishFreightOffer(offer) {
    console.log('📤 Publicando oferta en Trans.eu:', offer);

    if (!this.isConfigured) {
      console.log('⚠️ Sin credenciales Trans.eu, simulando publicación');
      return {
        success: true,
        offerId: `TEU-MOCK-${Date.now()}`,
        message: 'Oferta simulada (sin credenciales)',
        platform: 'transeu',
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

      const result = await this.apiRequest('POST', '/freights', payload);

      return {
        success: true,
        offerId: result?.id || `TEU-${Date.now()}`,
        message: 'Oferta publicada exitosamente en Trans.eu',
        platform: 'transeu',
        offer
      };
    } catch (error) {
      console.error('❌ Error publicando oferta Trans.eu:', error.message);
      throw error;
    }
  }

  /**
   * 📄 Obtener estado de una oferta publicada
   * GET /freights/{id}/status
   */
  async getFreightStatus(freightId) {
    console.log('📄 Obteniendo estado de oferta Trans.eu:', freightId);

    if (!this.isConfigured) {
      return { error: 'Sin credenciales Trans.eu', freightId };
    }

    try {
      const data = await this.apiRequest('GET', `/freights/${freightId}/status`);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo estado Trans.eu:', error.message);
      throw error;
    }
  }

  /**
   * 🔄 Parsear ofertas de carga de la respuesta API
   */
  parseFreightOffers(data) {
    try {
      const offers = data?.freights || data?.results || [];
      if (!offers || !Array.isArray(offers)) return [];

      return offers.map(offer => ({
        id: offer.id || `TEU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'transeu',
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
      console.error('Error parseando ofertas Trans.eu:', error.message);
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
        id: v.id || `TEU-V-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'transeu',
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
      console.error('Error parseando vehículos Trans.eu:', error.message);
      return [];
    }
  }

  /**
   * 📋 Datos mock de ofertas de carga
   * Rutas realistas de Europa Central y del Este vía Trans.eu
   */
  getMockFreightOffers(params) {
    const today = new Date();

    const allOffers = [
      // Warsaw → Berlin
      {
        id: 'TEU-a1b2c3d4',
        source: 'transeu',
        origin: {
          country: 'PL',
          city: 'Warsaw',
          postalCode: '00-001',
          date: this.formatDate(today)
        },
        destination: {
          country: 'DE',
          city: 'Berlin',
          postalCode: '10115',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 18000,
          loadingMeters: 13.6,
          volume: 70,
          description: 'Productos alimentarios',
          type: 'food'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 890,
          currency: 'EUR',
          pricePerKm: 1.52
        },
        distance: 585,
        contact: {
          company: 'Polskie Transport Sp. z o.o.',
          email: 'zlecenia@polskietransport.pl',
          phone: '+48 22 XXX XX XX',
          rating: 4.5
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Prague → Munich
      {
        id: 'TEU-e5f6a7b8',
        source: 'transeu',
        origin: {
          country: 'CZ',
          city: 'Prague',
          postalCode: '110 00',
          date: this.formatDate(today)
        },
        destination: {
          country: 'DE',
          city: 'Munich',
          postalCode: '80331',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 12000,
          loadingMeters: 8,
          volume: 40,
          description: 'Repuestos de automoción',
          type: 'auto_parts'
        },
        vehicleType: 'CURTAINSIDE',
        price: {
          amount: 650,
          currency: 'EUR',
          pricePerKm: 1.76
        },
        distance: 370,
        contact: {
          company: 'Bohemia Logistics s.r.o.',
          email: 'doprava@bohemialog.cz',
          phone: '+420 2XX XXX XXX',
          rating: 4.3
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Budapest → Vienna
      {
        id: 'TEU-c9d0e1f2',
        source: 'transeu',
        origin: {
          country: 'HU',
          city: 'Budapest',
          postalCode: '1011',
          date: this.formatDate(today)
        },
        destination: {
          country: 'AT',
          city: 'Vienna',
          postalCode: '1010',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 8000,
          loadingMeters: 6,
          volume: 30,
          description: 'Electrónica de consumo',
          type: 'electronics'
        },
        vehicleType: 'BOX_TRUCK',
        price: {
          amount: 480,
          currency: 'EUR',
          pricePerKm: 1.85
        },
        distance: 260,
        contact: {
          company: 'Magyar Fuvarozó Kft.',
          email: 'szallitas@magyarfuvarozo.hu',
          phone: '+36 1 XXX XXXX',
          rating: 4.6
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Bucharest → Stuttgart
      {
        id: 'TEU-a3b4c5d6',
        source: 'transeu',
        origin: {
          country: 'RO',
          city: 'Bucharest',
          postalCode: '010011',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'DE',
          city: 'Stuttgart',
          postalCode: '70173',
          date: this.formatDate(this.addDays(today, 3))
        },
        cargo: {
          weight: 24000,
          loadingMeters: 13.6,
          volume: 80,
          description: 'Materias primas industriales',
          type: 'raw_materials'
        },
        vehicleType: 'MEGA_TRAILER',
        price: {
          amount: 1850,
          currency: 'EUR',
          pricePerKm: 1.20
        },
        distance: 1540,
        contact: {
          company: 'Dacia Transport SRL',
          email: 'comenzi@daciatransport.ro',
          phone: '+40 21 XXX XXXX',
          rating: 4.2
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Bratislava → Copenhagen
      {
        id: 'TEU-e7f8a9b0',
        source: 'transeu',
        origin: {
          country: 'SK',
          city: 'Bratislava',
          postalCode: '811 01',
          date: this.formatDate(today)
        },
        destination: {
          country: 'DK',
          city: 'Copenhagen',
          postalCode: '1050',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 16000,
          loadingMeters: 11,
          volume: 55,
          description: 'Muebles y mobiliario',
          type: 'furniture'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 1650,
          currency: 'EUR',
          pricePerKm: 1.45
        },
        distance: 1140,
        contact: {
          company: 'Stredná Európa Logistika a.s.',
          email: 'objednavky@selogistika.sk',
          phone: '+421 2 XXXX XXXX',
          rating: 4.4
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Sofia → Hamburg
      {
        id: 'TEU-c1d2e3f4',
        source: 'transeu',
        origin: {
          country: 'BG',
          city: 'Sofia',
          postalCode: '1000',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'DE',
          city: 'Hamburg',
          postalCode: '20095',
          date: this.formatDate(this.addDays(today, 4))
        },
        cargo: {
          weight: 10000,
          loadingMeters: 7,
          volume: 35,
          description: 'Productos lácteos - temperatura controlada',
          type: 'dairy'
        },
        vehicleType: 'REFRIGERATED',
        price: {
          amount: 2100,
          currency: 'EUR',
          pricePerKm: 1.05
        },
        distance: 2000,
        contact: {
          company: 'Balkan Cool Chain EOOD',
          email: 'logistics@balkancoolchain.bg',
          phone: '+359 2 XXX XXXX',
          rating: 4.1
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Krakow → Amsterdam
      {
        id: 'TEU-a5b6c7d8',
        source: 'transeu',
        origin: {
          country: 'PL',
          city: 'Krakow',
          postalCode: '30-001',
          date: this.formatDate(today)
        },
        destination: {
          country: 'NL',
          city: 'Amsterdam',
          postalCode: '1012',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 20000,
          loadingMeters: 13.6,
          volume: 70,
          description: 'Productos químicos industriales',
          type: 'chemicals'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 1450,
          currency: 'EUR',
          pricePerKm: 1.14
        },
        distance: 1275,
        contact: {
          company: 'Kraków Spedycja Sp. z o.o.',
          email: 'ladunki@krakowspedycja.pl',
          phone: '+48 12 XXX XX XX',
          rating: 4.7
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Vilnius → Frankfurt
      {
        id: 'TEU-e9f0a1b2',
        source: 'transeu',
        origin: {
          country: 'LT',
          city: 'Vilnius',
          postalCode: 'LT-01100',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'DE',
          city: 'Frankfurt',
          postalCode: '60311',
          date: this.formatDate(this.addDays(today, 3))
        },
        cargo: {
          weight: 22000,
          loadingMeters: 13.6,
          volume: 75,
          description: 'Madera y productos forestales',
          type: 'timber'
        },
        vehicleType: 'PLATFORM',
        price: {
          amount: 1780,
          currency: 'EUR',
          pricePerKm: 1.10
        },
        distance: 1620,
        contact: {
          company: 'Baltic Timber Logistics UAB',
          email: 'kroviniai@baltictimber.lt',
          phone: '+370 5 XXX XXXX',
          rating: 4.3
        },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Barcelona → Prague
      {
        id: 'TEU-a1b2c3d4',
        source: 'transeu',
        origin: { country: 'ES', city: 'Barcelona', postalCode: '08001', date: this.formatDate(today) },
        destination: { country: 'CZ', city: 'Prague', postalCode: '11000', date: this.formatDate(this.addDays(today, 3)) },
        cargo: { weight: 18000, loadingMeters: 12, volume: 65, description: 'Componentes automocion', type: 'auto_parts' },
        vehicleType: 'TAUTLINER',
        price: { amount: 2150, currency: 'EUR', pricePerKm: 1.22 },
        distance: 1762,
        contact: { company: 'Euro Auto Logistics SL', email: 'export@euroauto.es', phone: '+34 93 XXX XX XX', rating: 4.5 },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 2).toISOString()
      },
      // Madrid → Warsaw
      {
        id: 'TEU-e5f6a7b8',
        source: 'transeu',
        origin: { country: 'ES', city: 'Madrid', postalCode: '28001', date: this.formatDate(this.addDays(today, 1)) },
        destination: { country: 'PL', city: 'Warsaw', postalCode: '00-001', date: this.formatDate(this.addDays(today, 4)) },
        cargo: { weight: 22000, loadingMeters: 13.6, volume: 78, description: 'Maquinaria industrial', type: 'machinery' },
        vehicleType: 'PLATFORM',
        price: { amount: 3200, currency: 'EUR', pricePerKm: 1.15 },
        distance: 2783,
        contact: { company: 'Castilla Industrial SL', email: 'logistica@castillaindustrial.es', phone: '+34 91 XXX XX XX', rating: 4.3 },
        publishedAt: new Date().toISOString(),
        validUntil: this.addDays(today, 3).toISOString()
      },
      // Valencia → Budapest
      {
        id: 'TEU-c9d0e1f2',
        source: 'transeu',
        origin: { country: 'ES', city: 'Valencia', postalCode: '46001', date: this.formatDate(today) },
        destination: { country: 'HU', city: 'Budapest', postalCode: '1011', date: this.formatDate(this.addDays(today, 3)) },
        cargo: { weight: 10000, loadingMeters: 8, volume: 40, description: 'Citricos frescos', type: 'perishable' },
        vehicleType: 'REFRIGERATED',
        price: { amount: 2680, currency: 'EUR', pricePerKm: 1.30 },
        distance: 2062,
        contact: { company: 'Naranjas Express SL', email: 'export@naranjasexpress.es', phone: '+34 96 XXX XX XX', rating: 4.6 },
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
        id: 'TEU-V-001',
        source: 'transeu',
        type: 'vehicle',
        location: {
          country: params.country || 'PL',
          city: params.city || 'Warsaw'
        },
        destination: {
          country: 'DE',
          city: 'Alemania oeste'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 4)),
        vehicle: {
          type: 'TAUTLINER',
          capacity: 24000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Varsovia Express Sp. z o.o.',
          email: 'flota@varsoviaexpress.pl',
          phone: '+48 22 XXX XX XX',
          rating: 4.6
        }
      },
      {
        id: 'TEU-V-002',
        source: 'transeu',
        type: 'vehicle',
        location: {
          country: 'CZ',
          city: 'Brno'
        },
        destination: {
          country: 'AT',
          city: 'Austria / Alemania sur'
        },
        availableFrom: this.formatDate(this.addDays(today, 1)),
        availableTo: this.formatDate(this.addDays(today, 5)),
        vehicle: {
          type: 'CURTAINSIDE',
          capacity: 22000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Morava Trans s.r.o.',
          email: 'vozidla@moravatrans.cz',
          phone: '+420 5XX XXX XXX',
          rating: 4.4
        }
      },
      {
        id: 'TEU-V-003',
        source: 'transeu',
        type: 'vehicle',
        location: {
          country: 'RO',
          city: 'Cluj-Napoca'
        },
        destination: {
          country: 'HU',
          city: 'Europa Central'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 6)),
        vehicle: {
          type: 'MEGA_TRAILER',
          capacity: 25000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Transilvania Cargo SRL',
          email: 'flota@transilvaniacargo.ro',
          phone: '+40 264 XXX XXX',
          rating: 4.2
        }
      },
      {
        id: 'TEU-V-004',
        source: 'transeu',
        type: 'vehicle',
        location: {
          country: 'LT',
          city: 'Kaunas'
        },
        destination: {
          country: 'SE',
          city: 'Escandinavia'
        },
        availableFrom: this.formatDate(this.addDays(today, 2)),
        availableTo: this.formatDate(this.addDays(today, 7)),
        vehicle: {
          type: 'REFRIGERATED',
          capacity: 20000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Baltic Reefer UAB',
          email: 'transportas@balticreefer.lt',
          phone: '+370 37 XXX XXX',
          rating: 4.5
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
      description: 'Plataforma logística líder en Europa Central y del Este',
      strengths: [
        'Polonia - Alemania',
        'Chequia / Eslovaquia - Europa Occidental',
        'Hungría - Austria',
        'Rumanía / Bulgaria - Europa Central',
        'Países Bálticos - Escandinavia',
        'Corredor Este-Oeste europeo'
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
        this.accessToken = null;
        this.tokenExpiry = null;
        return new Error('Credenciales Trans.eu inválidas o token expirado');
      } else if (status === 403) {
        return new Error('Acceso denegado a Trans.eu API');
      } else if (status === 429) {
        return new Error('Límite de peticiones excedido en Trans.eu');
      } else if (status === 500) {
        return new Error('Error interno del servidor Trans.eu');
      }

      return new Error(`Error Trans.eu: ${status} - ${JSON.stringify(data)}`);
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
      service: 'Trans.eu',
      status: this.isConfigured ? 'configured' : 'demo_mode',
      endpoint: this.baseURL,
      authenticated: !!(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry),
      coverage: this.coverageCountries,
      cache: {
        searches: this.cache.searches.size,
        offers: this.cache.offers.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TranseuService;
