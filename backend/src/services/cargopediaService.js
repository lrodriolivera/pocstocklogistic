/**
 * 🟠 Cargopedia Freight Exchange Service
 *
 * Integracion con la API REST v1 de Cargopedia para:
 * - Busqueda de cargas disponibles
 * - Publicacion de ofertas de flete
 * - Busqueda de vehiculos disponibles
 * - Detalles de ofertas
 *
 * Cobertura: Europa del Este y del Sur (RO, BG, TR, GR, HU, PL, CZ, SK, RS, HR, SI, MD, UA)
 *
 * Documentacion: https://www.cargopedia.net/downloads/cargopedia-api.pdf
 *
 * @author AXEL Team
 * @version 1.0.0
 */

const axios = require('axios');

class CargopediaService {
  constructor() {
    this.baseURL = 'https://www.cargopedia.net/api/v1';
    this.credentials = {
      apiKey: process.env.CARGOPEDIA_API_KEY,
      userId: process.env.CARGOPEDIA_USER_ID
    };
    this.isConfigured = !!(this.credentials.apiKey);

    // Cache para ofertas
    this.cache = {
      searches: new Map(),
      offers: new Map()
    };

    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos

    // Paises principales de Cargopedia (Europa del Este y del Sur)
    this.coverageCountries = ['RO', 'BG', 'TR', 'GR', 'HU', 'PL', 'CZ', 'SK', 'RS', 'HR', 'SI', 'MD', 'UA'];

    console.log('🟠 CargopediaService inicializado');
    console.log(`   Endpoint: ${this.baseURL}`);
    console.log(`   API Key: ${this.credentials.apiKey ? this.credentials.apiKey.substring(0, 8) + '***' : 'No configurado'}`);
    console.log(`   User ID: ${this.credentials.userId ? this.credentials.userId.substring(0, 8) + '***' : 'No configurado'}`);
  }

  /**
   * 📡 Enviar peticion REST autenticada a Cargopedia
   */
  async sendRequest(method, path, data = null, params = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${path}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Api-Key': this.credentials.apiKey
        },
        timeout: 15000
      };

      if (this.credentials.userId) {
        config.headers['X-User-Id'] = this.credentials.userId;
      }

      if (data) config.data = data;
      if (params) config.params = params;

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ Error en peticion Cargopedia ${method} ${path}:`, error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * 🔍 Buscar ofertas de carga en Cargopedia
   *
   * @param {Object} params - Parametros de busqueda
   * @param {string} params.originCountry - Pais de origen
   * @param {string} params.originCity - Ciudad de origen
   * @param {string} params.destinationCountry - Pais de destino
   * @param {string} params.destinationCity - Ciudad de destino
   * @param {number} params.radiusKm - Radio de busqueda en km
   * @param {Date} params.fromDate - Fecha desde
   * @param {Date} params.toDate - Fecha hasta
   */
  async searchFreightOffers(params) {
    const cacheKey = JSON.stringify(params);

    // Verificar cache
    if (this.cache.searches.has(cacheKey)) {
      const cached = this.cache.searches.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Cargopedia search cache hit');
        return cached.data;
      }
    }

    console.log('🔍 Buscando ofertas en Cargopedia:', params);

    // Si no hay credenciales, devolver datos de demostracion
    if (!this.isConfigured) {
      console.log('⚠️ Sin credenciales Cargopedia, usando datos de demostracion');
      return this.getMockFreightOffers(params);
    }

    try {
      const queryParams = {
        origin_country: params.originCountry || 'RO',
        radius_km: params.radiusKm || 50,
        date_from: this.formatDate(params.fromDate || new Date()),
        date_to: this.formatDate(params.toDate || this.addDays(new Date(), 7)),
        limit: 50
      };

      if (params.originCity) queryParams.origin_city = params.originCity;
      if (params.destinationCountry) queryParams.destination_country = params.destinationCountry;
      if (params.destinationCity) queryParams.destination_city = params.destinationCity;

      const result = await this.sendRequest('GET', '/loads', null, queryParams);
      const offers = this.parseOffers(result);

      // Guardar en cache
      this.cache.searches.set(cacheKey, {
        data: offers,
        timestamp: Date.now()
      });

      return offers;
    } catch (error) {
      console.error('❌ Error buscando ofertas Cargopedia:', error.message);
      // Fallback a datos mock en caso de error
      return this.getMockFreightOffers(params);
    }
  }

  /**
   * 📤 Publicar oferta de carga en Cargopedia
   */
  async publishFreightOffer(offer) {
    console.log('📤 Publicando oferta en Cargopedia:', offer);

    if (!this.isConfigured) {
      console.log('⚠️ Sin credenciales Cargopedia, simulando publicacion');
      return {
        success: true,
        offerId: `CP-MOCK-${Date.now()}`,
        message: 'Oferta simulada (sin credenciales)',
        platform: 'cargopedia',
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
          weight_unit: 'kg',
          loading_meters: offer.loadingMeters || 0,
          description: offer.description || ''
        },
        truck_type: offer.vehicleType || 'TAUTLINER',
        price: {
          amount: offer.price || 0,
          currency: 'EUR'
        }
      };

      const result = await this.sendRequest('POST', '/loads', payload);

      return {
        success: true,
        offerId: result?.id || result?.load_id || `CP-${Date.now()}`,
        message: 'Oferta publicada exitosamente en Cargopedia',
        platform: 'cargopedia',
        offer
      };
    } catch (error) {
      console.error('❌ Error publicando oferta Cargopedia:', error.message);
      throw error;
    }
  }

  /**
   * 📋 Obtener detalles de una oferta
   */
  async getOfferDetails(id) {
    console.log(`📋 Obteniendo detalles de oferta ${id} en Cargopedia`);

    if (!this.isConfigured) {
      return {
        id,
        message: 'Sin credenciales - modo demostracion'
      };
    }

    try {
      const result = await this.sendRequest('GET', `/loads/${id}`);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo detalles Cargopedia:', error.message);
      throw error;
    }
  }

  /**
   * 🚚 Buscar vehiculos disponibles en Cargopedia
   */
  async searchVehicleOffers(params) {
    console.log('🚚 Buscando vehiculos en Cargopedia:', params);

    if (!this.isConfigured) {
      return this.getMockVehicleOffers(params);
    }

    try {
      const queryParams = {
        country: params.country || 'RO',
        radius_km: params.radiusKm || 100,
        available_from: this.formatDate(params.fromDate || new Date()),
        available_to: this.formatDate(params.toDate || this.addDays(new Date(), 7)),
        limit: 30
      };

      if (params.city) queryParams.city = params.city;
      if (params.vehicleType) queryParams.truck_type = params.vehicleType;

      const result = await this.sendRequest('GET', '/trucks', null, queryParams);
      return this.parseVehicleOffers(result);
    } catch (error) {
      console.error('❌ Error buscando vehiculos Cargopedia:', error.message);
      return this.getMockVehicleOffers(params);
    }
  }

  /**
   * 🔄 Parsear ofertas de carga de respuesta API
   */
  parseOffers(apiResult) {
    try {
      const loads = apiResult?.loads || apiResult?.data || [];
      if (!loads || !Array.isArray(loads)) return [];

      return loads.map(l => ({
        id: l.id || l.load_id || `CP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'cargopedia',
        origin: {
          country: l.loading?.country || '',
          city: l.loading?.city || '',
          postalCode: l.loading?.postal_code || '',
          date: l.loading?.date || ''
        },
        destination: {
          country: l.unloading?.country || '',
          city: l.unloading?.city || '',
          postalCode: l.unloading?.postal_code || '',
          date: l.unloading?.date || ''
        },
        cargo: {
          weight: parseFloat(l.cargo?.weight) || 0,
          loadingMeters: parseFloat(l.cargo?.loading_meters) || 0,
          description: l.cargo?.description || ''
        },
        vehicleType: l.truck_type || l.vehicle_type || 'TAUTLINER',
        price: {
          amount: parseFloat(l.price?.amount || l.price?.value) || 0,
          currency: l.price?.currency || 'EUR'
        },
        contact: {
          company: l.publisher?.company || l.contact?.company || '',
          email: l.publisher?.email || l.contact?.email || '',
          phone: l.publisher?.phone || l.contact?.phone || ''
        },
        publishedAt: l.published_at || l.created_at || new Date().toISOString(),
        distance: l.distance || 0,
        pricePerKm: l.price_per_km || (l.distance ? (parseFloat(l.price?.amount || l.price?.value) / l.distance) : 0)
      }));
    } catch (error) {
      console.error('Error parseando ofertas Cargopedia:', error.message);
      return [];
    }
  }

  /**
   * 🔄 Parsear ofertas de vehiculos
   */
  parseVehicleOffers(apiResult) {
    try {
      const trucks = apiResult?.trucks || apiResult?.data || [];
      if (!trucks || !Array.isArray(trucks)) return [];

      return trucks.map(t => ({
        id: t.id || `CP-V-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'cargopedia',
        type: 'vehicle',
        location: {
          country: t.location?.country || '',
          city: t.location?.city || ''
        },
        availableFrom: t.available_from || '',
        availableTo: t.available_to || '',
        vehicle: {
          type: t.truck?.type || t.truck_type || 'TAUTLINER',
          capacity: parseFloat(t.truck?.capacity || t.capacity) || 0,
          loadingMeters: parseFloat(t.truck?.loading_meters || t.loading_meters) || 13.6
        },
        contact: {
          company: t.owner?.company || t.contact?.company || '',
          email: t.owner?.email || t.contact?.email || '',
          phone: t.owner?.phone || t.contact?.phone || ''
        }
      }));
    } catch (error) {
      console.error('Error parseando vehiculos Cargopedia:', error.message);
      return [];
    }
  }

  /**
   * 📋 Datos mock de ofertas de carga (Europa del Este y del Sur)
   */
  getMockFreightOffers(params) {
    const today = new Date();

    const allOffers = [
      {
        id: 'CP-001',
        source: 'cargopedia',
        origin: {
          country: 'RO',
          city: 'Bucarest',
          postalCode: '010011',
          date: this.formatDate(today)
        },
        destination: {
          country: 'TR',
          city: 'Estambul',
          postalCode: '34000',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 20000,
          loadingMeters: 13.6,
          description: 'Textiles y confeccion'
        },
        vehicleType: 'TAUTLINER',
        price: { amount: 1200, currency: 'EUR' },
        contact: {
          company: 'Romania Cargo SRL',
          email: 'transport@romaniacargo.ro',
          phone: '+40 21 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 620,
        pricePerKm: 1.94
      },
      {
        id: 'CP-002',
        source: 'cargopedia',
        origin: {
          country: 'GR',
          city: 'Atenas',
          postalCode: '10431',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'BG',
          city: 'Sofia',
          postalCode: '1000',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 8000,
          loadingMeters: 6,
          description: 'Productos alimenticios'
        },
        vehicleType: 'BOX_TRUCK',
        price: { amount: 680, currency: 'EUR' },
        contact: {
          company: 'Hellas Transport SA',
          email: 'cargo@hellastrans.gr',
          phone: '+30 21 XXXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 530,
        pricePerKm: 1.28
      },
      {
        id: 'CP-003',
        source: 'cargopedia',
        origin: {
          country: 'HR',
          city: 'Zagreb',
          postalCode: '10000',
          date: this.formatDate(today)
        },
        destination: {
          country: 'DE',
          city: 'Munich',
          postalCode: '80331',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 14000,
          loadingMeters: 10,
          description: 'Piezas de automocion'
        },
        vehicleType: 'CURTAINSIDE',
        price: { amount: 950, currency: 'EUR' },
        contact: {
          company: 'Adriatic Logistics d.o.o.',
          email: 'prijevoz@adriaticlog.hr',
          phone: '+385 1 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 580,
        pricePerKm: 1.64
      },
      {
        id: 'CP-004',
        source: 'cargopedia',
        origin: {
          country: 'RS',
          city: 'Belgrado',
          postalCode: '11000',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'AT',
          city: 'Viena',
          postalCode: '1010',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 16000,
          loadingMeters: 12,
          description: 'Bienes de consumo'
        },
        vehicleType: 'TAUTLINER',
        price: { amount: 720, currency: 'EUR' },
        contact: {
          company: 'Balkan Express d.o.o.',
          email: 'transport@balkanexpress.rs',
          phone: '+381 11 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 600,
        pricePerKm: 1.20
      },
      {
        id: 'CP-005',
        source: 'cargopedia',
        origin: {
          country: 'GR',
          city: 'Tesalonica',
          postalCode: '54621',
          date: this.formatDate(today)
        },
        destination: {
          country: 'HU',
          city: 'Budapest',
          postalCode: '1011',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 10000,
          loadingMeters: 8,
          description: 'Productos frescos perecederos'
        },
        vehicleType: 'REFRIGERATED',
        price: { amount: 850, currency: 'EUR' },
        contact: {
          company: 'Aegean Reefer Transport',
          email: 'loads@aegeanreefer.gr',
          phone: '+30 23 XXXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 1100,
        pricePerKm: 0.77
      },
      {
        id: 'CP-006',
        source: 'cargopedia',
        origin: {
          country: 'MD',
          city: 'Chisinau',
          postalCode: 'MD-2000',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'PL',
          city: 'Varsovia',
          postalCode: '00-001',
          date: this.formatDate(this.addDays(today, 3))
        },
        cargo: {
          weight: 22000,
          loadingMeters: 13.6,
          description: 'Productos agricolas'
        },
        vehicleType: 'MEGA_TRAILER',
        price: { amount: 1100, currency: 'EUR' },
        contact: {
          company: 'Moldova Trans SRL',
          email: 'cargo@moldovatrans.md',
          phone: '+373 22 XXX XXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 950,
        pricePerKm: 1.16
      },
      // Bilbao → Bucharest
      {
        id: 'CP-g7h8i9j0',
        source: 'cargopedia',
        origin: { country: 'ES', city: 'Bilbao', postalCode: '48001' },
        destination: { country: 'RO', city: 'Bucharest', postalCode: '010011' },
        cargo: { weight: 16000, loadingMeters: 11, description: 'Piezas de recambio industrial', type: 'auto_parts' },
        vehicleType: 'TAUTLINER',
        price: { amount: 2850, currency: 'EUR' },
        contact: { company: 'Euskadi Cargo SL', email: 'ops@euskadicargo.es', phone: '+34 94 XXX XX XX' },
        publishedAt: new Date().toISOString(),
        distance: 2650,
        pricePerKm: 1.08
      },
      // Madrid → Istanbul
      {
        id: 'CP-k1l2m3n4',
        source: 'cargopedia',
        origin: { country: 'ES', city: 'Madrid', postalCode: '28001' },
        destination: { country: 'TR', city: 'Istanbul', postalCode: '34000' },
        cargo: { weight: 20000, loadingMeters: 13.6, description: 'Productos quimicos (no ADR)', type: 'chemicals' },
        vehicleType: 'CISTERNA',
        price: { amount: 4200, currency: 'EUR' },
        contact: { company: 'Quimica Transport SL', email: 'trafico@quimicatransport.es', phone: '+34 91 XXX XX XX' },
        publishedAt: new Date().toISOString(),
        distance: 3550,
        pricePerKm: 1.18
      }
    ];

    // Filtrar por parametros
    return allOffers.filter(offer => {
      if (params.originCountry && offer.origin.country !== params.originCountry) return false;
      if (params.destinationCountry && offer.destination.country !== params.destinationCountry) return false;
      if (params.originCity && !offer.origin.city.toLowerCase().includes(params.originCity.toLowerCase())) return false;
      if (params.destinationCity && !offer.destination.city.toLowerCase().includes(params.destinationCity.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * 📋 Datos mock de vehiculos disponibles
   */
  getMockVehicleOffers(params) {
    const today = new Date();

    return [
      {
        id: 'CP-V-001',
        source: 'cargopedia',
        type: 'vehicle',
        location: {
          country: params.country || 'RO',
          city: params.city || 'Bucarest'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 5)),
        vehicle: {
          type: 'TAUTLINER',
          capacity: 24000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Dacia Fleet Services SRL',
          email: 'flota@daciafleet.ro',
          phone: '+40 21 XXX XXXX'
        }
      },
      {
        id: 'CP-V-002',
        source: 'cargopedia',
        type: 'vehicle',
        location: {
          country: 'BG',
          city: 'Sofia'
        },
        availableFrom: this.formatDate(this.addDays(today, 1)),
        availableTo: this.formatDate(this.addDays(today, 6)),
        vehicle: {
          type: 'CURTAINSIDE',
          capacity: 22000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Balkans Truck OOD',
          email: 'kamioni@balkanstruck.bg',
          phone: '+359 2 XXX XXXX'
        }
      },
      {
        id: 'CP-V-003',
        source: 'cargopedia',
        type: 'vehicle',
        location: {
          country: 'TR',
          city: 'Estambul'
        },
        availableFrom: this.formatDate(this.addDays(today, 2)),
        availableTo: this.formatDate(this.addDays(today, 7)),
        vehicle: {
          type: 'MEGA_TRAILER',
          capacity: 25000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Anatolian Logistics A.S.',
          email: 'araclar@anatolianlog.com.tr',
          phone: '+90 212 XXX XXXX'
        }
      }
    ];
  }

  /**
   * ⚠️ Manejar errores de la API
   */
  handleApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        return new Error('API Key de Cargopedia invalida');
      } else if (status === 403) {
        return new Error('Acceso denegado a Cargopedia API');
      } else if (status === 429) {
        return new Error('Limite de peticiones excedido en Cargopedia');
      } else if (status === 500) {
        return new Error('Error interno del servidor Cargopedia');
      }

      return new Error(`Error Cargopedia: ${status} - ${JSON.stringify(data)}`);
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
   * 📅 Anadir dias a una fecha
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
      service: 'Cargopedia',
      status: this.isConfigured ? 'configured' : 'demo_mode',
      endpoint: this.baseURL,
      apiKey: this.credentials.apiKey ? `${this.credentials.apiKey.substring(0, 8)}...` : 'not_set',
      userId: this.credentials.userId ? `${this.credentials.userId.substring(0, 8)}...` : 'not_set',
      coverage: this.coverageCountries,
      features: ['loads', 'trucks', 'load_details'],
      cache: {
        searches: this.cache.searches.size,
        offers: this.cache.offers.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CargopediaService;
