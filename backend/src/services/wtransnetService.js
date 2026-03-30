/**
 * 🚚 Wtransnet Freight Exchange Service
 *
 * Integración con Wtransnet - Bolsa de cargas del sur de Europa
 *
 * NOTA: Wtransnet no tiene API pública documentada.
 * Este servicio está preparado para:
 * 1. Integración futura cuando se obtenga acceso API
 * 2. Datos de demostración para la POC
 *
 * Web: https://www.wtransnet.com
 *
 * @author AXEL Team
 * @version 1.0.0
 */

const axios = require('axios');

class WtransnetService {
  constructor() {
    this.user = process.env.WTRANSNET_USER || '';
    this.password = process.env.WTRANSNET_PASSWORD || '';

    // URLs de Wtransnet (preparado para integración futura)
    this.baseUrl = 'https://www.wtransnet.com';
    this.apiUrl = 'https://api.wtransnet.com'; // Hipotético - pendiente de confirmar

    // Cache para ofertas
    this.cache = {
      searches: new Map(),
      offers: new Map()
    };

    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos

    // Países principales de Wtransnet (Sur de Europa)
    this.coverageCountries = ['ES', 'PT', 'FR', 'IT', 'MA', 'AD'];

    console.log('🚚 WtransnetService inicializado');
    console.log(`   Usuario: ${this.user ? this.user.substring(0, 5) + '***' : 'No configurado'}`);
    console.log('   ⚠️ Usando datos de demostración (API no disponible públicamente)');
  }

  /**
   * 🔍 Buscar ofertas de carga en Wtransnet
   *
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.originCountry - País de origen
   * @param {string} params.originCity - Ciudad de origen
   * @param {string} params.destinationCountry - País de destino
   * @param {string} params.destinationCity - Ciudad de destino
   * @param {Date} params.fromDate - Fecha desde
   * @param {Date} params.toDate - Fecha hasta
   */
  async searchFreightOffers(params) {
    const cacheKey = JSON.stringify(params);

    // Verificar cache
    if (this.cache.searches.has(cacheKey)) {
      const cached = this.cache.searches.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Wtransnet search cache hit');
        return cached.data;
      }
    }

    console.log('🔍 Buscando ofertas en Wtransnet:', params);

    // Por ahora usamos datos de demostración
    // En el futuro, aquí iría la integración real con la API de Wtransnet
    const offers = this.getMockFreightOffers(params);

    // Guardar en cache
    this.cache.searches.set(cacheKey, {
      data: offers,
      timestamp: Date.now()
    });

    return offers;
  }

  /**
   * 📤 Publicar oferta de carga en Wtransnet
   */
  async publishFreightOffer(offer) {
    console.log('📤 Publicando oferta en Wtransnet:', offer);

    // Simulación de publicación
    return {
      success: true,
      offerId: `WT-${Date.now()}`,
      message: 'Oferta registrada (pendiente de integración API)',
      platform: 'wtransnet',
      offer,
      note: 'Para publicación real, acceder a www.wtransnet.com con las credenciales proporcionadas'
    };
  }

  /**
   * 🚚 Buscar ofertas de vehículos disponibles
   */
  async searchVehicleOffers(params) {
    console.log('🚚 Buscando vehículos en Wtransnet:', params);
    return this.getMockVehicleOffers(params);
  }

  /**
   * 📋 Generar datos mock de ofertas de carga
   * Datos realistas basados en rutas típicas de Wtransnet
   */
  getMockFreightOffers(params) {
    const today = new Date();

    const allOffers = [
      // España - Portugal
      {
        id: 'WT-001',
        source: 'wtransnet',
        origin: {
          country: 'ES',
          city: 'Madrid',
          postalCode: '28001',
          date: this.formatDate(today)
        },
        destination: {
          country: 'PT',
          city: 'Lisboa',
          postalCode: '1000',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 20000,
          loadingMeters: 13.6,
          description: 'Carga completa - Productos alimentarios'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 850,
          currency: 'EUR'
        },
        contact: {
          company: 'Transportes Ibéricos SL',
          email: 'cargas@tibericos.es',
          phone: '+34 91 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 625,
        pricePerKm: 1.36
      },
      // España - Francia
      {
        id: 'WT-002',
        source: 'wtransnet',
        origin: {
          country: 'ES',
          city: 'Barcelona',
          postalCode: '08001',
          date: this.formatDate(today)
        },
        destination: {
          country: 'FR',
          city: 'Toulouse',
          postalCode: '31000',
          date: this.formatDate(this.addDays(today, 1))
        },
        cargo: {
          weight: 18000,
          loadingMeters: 12,
          description: 'Autopartes - Carga parcial'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 680,
          currency: 'EUR'
        },
        contact: {
          company: 'Trans Catalunya',
          email: 'operaciones@transcatalunya.es',
          phone: '+34 93 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 390,
        pricePerKm: 1.74
      },
      // Francia - Italia
      {
        id: 'WT-003',
        source: 'wtransnet',
        origin: {
          country: 'FR',
          city: 'Marsella',
          postalCode: '13001',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'IT',
          city: 'Génova',
          postalCode: '16121',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 22000,
          loadingMeters: 13.6,
          description: 'Material de construcción'
        },
        vehicleType: 'MEGA_TRAILER',
        price: {
          amount: 720,
          currency: 'EUR'
        },
        contact: {
          company: 'Méditerranée Transport',
          email: 'fret@medtransport.fr',
          phone: '+33 4 XX XX XX XX'
        },
        publishedAt: new Date().toISOString(),
        distance: 410,
        pricePerKm: 1.76
      },
      // España - Marruecos
      {
        id: 'WT-004',
        source: 'wtransnet',
        origin: {
          country: 'ES',
          city: 'Algeciras',
          postalCode: '11201',
          date: this.formatDate(today)
        },
        destination: {
          country: 'MA',
          city: 'Casablanca',
          postalCode: '20000',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 24000,
          loadingMeters: 13.6,
          description: 'Maquinaria industrial'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 1450,
          currency: 'EUR'
        },
        contact: {
          company: 'Estrecho Logistics',
          email: 'booking@estrecholog.es',
          phone: '+34 956 XXX XXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 580,
        pricePerKm: 2.50,
        notes: 'Incluye ferry Algeciras-Tánger'
      },
      // Valencia - Milán
      {
        id: 'WT-005',
        source: 'wtransnet',
        origin: {
          country: 'ES',
          city: 'Valencia',
          postalCode: '46001',
          date: this.formatDate(this.addDays(today, 1))
        },
        destination: {
          country: 'IT',
          city: 'Milán',
          postalCode: '20121',
          date: this.formatDate(this.addDays(today, 3))
        },
        cargo: {
          weight: 16000,
          loadingMeters: 10,
          description: 'Cerámica y azulejos'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 1680,
          currency: 'EUR'
        },
        contact: {
          company: 'Levante Express',
          email: 'trafico@levanteexpress.es',
          phone: '+34 96 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 1180,
        pricePerKm: 1.42
      },
      // Portugal - Francia
      {
        id: 'WT-006',
        source: 'wtransnet',
        origin: {
          country: 'PT',
          city: 'Oporto',
          postalCode: '4000',
          date: this.formatDate(today)
        },
        destination: {
          country: 'FR',
          city: 'Burdeos',
          postalCode: '33000',
          date: this.formatDate(this.addDays(today, 2))
        },
        cargo: {
          weight: 19000,
          loadingMeters: 13.6,
          description: 'Vino a granel - Control temperatura'
        },
        vehicleType: 'FRIGORÍFICO',
        price: {
          amount: 1250,
          currency: 'EUR'
        },
        contact: {
          company: 'Vinhos Transport Lda',
          email: 'logistica@vinhostransport.pt',
          phone: '+351 22 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 780,
        pricePerKm: 1.60
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
   * 📋 Generar datos mock de vehículos disponibles
   */
  getMockVehicleOffers(params) {
    const today = new Date();

    return [
      {
        id: 'WT-V-001',
        source: 'wtransnet',
        type: 'vehicle',
        location: {
          country: params.country || 'ES',
          city: params.city || 'Madrid'
        },
        destination: {
          country: 'FR',
          city: 'Cualquier destino'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 3)),
        vehicle: {
          type: 'TAUTLINER',
          capacity: 24000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Transportes Peninsulares',
          email: 'disponibilidad@tpeninsulares.es',
          phone: '+34 91 XXX XXXX'
        }
      },
      {
        id: 'WT-V-002',
        source: 'wtransnet',
        type: 'vehicle',
        location: {
          country: 'PT',
          city: 'Lisboa'
        },
        destination: {
          country: 'ES',
          city: 'Nacional'
        },
        availableFrom: this.formatDate(this.addDays(today, 1)),
        availableTo: this.formatDate(this.addDays(today, 5)),
        vehicle: {
          type: 'MEGA_TRAILER',
          capacity: 25000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Lusitania Transportes',
          email: 'frota@lusitania.pt',
          phone: '+351 21 XXX XXXX'
        }
      },
      {
        id: 'WT-V-003',
        source: 'wtransnet',
        type: 'vehicle',
        location: {
          country: 'ES',
          city: 'Sevilla'
        },
        destination: {
          country: 'MA',
          city: 'Marruecos'
        },
        availableFrom: this.formatDate(today),
        availableTo: this.formatDate(this.addDays(today, 7)),
        vehicle: {
          type: 'TAUTLINER',
          capacity: 24000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Andalucía - Magreb Trans',
          email: 'cargas@amtrans.es',
          phone: '+34 95 XXX XXXX'
        },
        notes: 'Documentación Marruecos en regla'
      }
    ];
  }

  /**
   * 🌐 Obtener información de cobertura del servicio
   */
  getCoverage() {
    return {
      mainCountries: this.coverageCountries,
      description: 'Bolsa de cargas especializada en el sur de Europa y Magreb',
      strengths: [
        'España - Portugal',
        'España - Francia',
        'España - Marruecos',
        'Península Ibérica - Italia',
        'Rutas mediterráneas'
      ]
    };
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
      service: 'Wtransnet',
      status: this.user && this.password ? 'credentials_configured' : 'demo_mode',
      mode: 'demonstration', // Cambiar a 'live' cuando se tenga API
      user: this.user ? `${this.user.substring(0, 5)}...` : 'not_set',
      coverage: this.coverageCountries,
      cache: {
        searches: this.cache.searches.size,
        offers: this.cache.offers.size
      },
      note: 'API de Wtransnet no disponible públicamente. Acceder vía web.',
      webAccess: 'https://www.wtransnet.com',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WtransnetService;
