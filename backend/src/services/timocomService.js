/**
 * 🚛 Timocom Freight Exchange Service
 *
 * Integración con la API SOAP de Timocom para:
 * - Búsqueda de ofertas de carga
 * - Publicación de ofertas de flete
 * - Gestión de contactos y clientes
 *
 * Documentación: https://developer.timocom.com/
 *
 * @author Stock Logistic Team
 * @version 1.0.0
 */

const axios = require('axios');
const xml2js = require('xml2js');

class TimocomService {
  constructor() {
    this.user = process.env.TIMOCOM_USER || '';
    this.password = process.env.TIMOCOM_PASSWORD || '';

    // Timocom SOAP API endpoints
    this.endpoints = {
      production: 'https://webservice.timocom.com/freight-exchange/v2',
      sandbox: 'https://webservice-test.timocom.com/freight-exchange/v2'
    };

    this.baseUrl = process.env.NODE_ENV === 'production'
      ? this.endpoints.production
      : this.endpoints.sandbox;

    // Cache para ofertas
    this.cache = {
      searches: new Map(),
      offers: new Map()
    };

    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos

    // XML Builder/Parser
    this.xmlBuilder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true }
    });
    this.xmlParser = new xml2js.Parser({ explicitArray: false });

    console.log('🚛 TimocomService inicializado');
    console.log(`   Endpoint: ${this.baseUrl}`);
    console.log(`   Usuario: ${this.user ? this.user.substring(0, 5) + '***' : 'No configurado'}`);
  }

  /**
   * 🔐 Generar cabecera de autenticación SOAP
   */
  buildAuthHeader() {
    return `${this.user}:${this.password}`;
  }

  /**
   * 📦 Construir envelope SOAP
   */
  buildSoapEnvelope(body) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tc="http://www.timocom.com/freight-exchange/v2">
  <soap:Header>
    <tc:Authentication>
      <tc:Credentials>${this.buildAuthHeader()}</tc:Credentials>
    </tc:Authentication>
  </soap:Header>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * 📡 Enviar petición SOAP a Timocom
   */
  async sendSoapRequest(action, body) {
    try {
      const envelope = this.buildSoapEnvelope(body);

      const response = await axios.post(this.baseUrl, envelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': action
        },
        timeout: 15000
      });

      const result = await this.xmlParser.parseStringPromise(response.data);
      return result;
    } catch (error) {
      console.error('❌ Error en petición SOAP Timocom:', error.message);
      throw this.handleSoapError(error);
    }
  }

  /**
   * 🔍 Buscar ofertas de carga en Timocom
   *
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.originCountry - País de origen (ES, FR, DE, etc.)
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
        console.log('📦 Timocom search cache hit');
        return cached.data;
      }
    }

    console.log('🔍 Buscando ofertas en Timocom:', params);

    // Si no hay credenciales, devolver datos de demostración
    if (!this.user || !this.password) {
      console.log('⚠️ Sin credenciales Timocom, usando datos de demostración');
      return this.getMockFreightOffers(params);
    }

    try {
      const searchBody = `
    <tc:FindCargoOffers>
      <tc:SearchCriteria>
        <tc:Loading>
          <tc:Country>${params.originCountry || 'ES'}</tc:Country>
          ${params.originCity ? `<tc:City>${params.originCity}</tc:City>` : ''}
          <tc:Radius>${params.radiusKm || 50}</tc:Radius>
        </tc:Loading>
        <tc:Unloading>
          <tc:Country>${params.destinationCountry || ''}</tc:Country>
          ${params.destinationCity ? `<tc:City>${params.destinationCity}</tc:City>` : ''}
          <tc:Radius>${params.radiusKm || 50}</tc:Radius>
        </tc:Unloading>
        <tc:DateRange>
          <tc:From>${this.formatDate(params.fromDate || new Date())}</tc:From>
          <tc:To>${this.formatDate(params.toDate || this.addDays(new Date(), 7))}</tc:To>
        </tc:DateRange>
        <tc:MaxResults>50</tc:MaxResults>
      </tc:SearchCriteria>
    </tc:FindCargoOffers>`;

      const result = await this.sendSoapRequest('FindCargoOffers', searchBody);
      const offers = this.parseCargoOffers(result);

      // Guardar en cache
      this.cache.searches.set(cacheKey, {
        data: offers,
        timestamp: Date.now()
      });

      return offers;
    } catch (error) {
      console.error('❌ Error buscando ofertas Timocom:', error.message);
      // Fallback a datos mock en caso de error
      return this.getMockFreightOffers(params);
    }
  }

  /**
   * 📤 Publicar oferta de carga en Timocom
   */
  async publishFreightOffer(offer) {
    console.log('📤 Publicando oferta en Timocom:', offer);

    if (!this.user || !this.password) {
      console.log('⚠️ Sin credenciales Timocom, simulando publicación');
      return {
        success: true,
        offerId: `MOCK-${Date.now()}`,
        message: 'Oferta simulada (sin credenciales)',
        offer
      };
    }

    try {
      const publishBody = `
    <tc:StoreCargoOffer>
      <tc:CargoOffer>
        <tc:Loading>
          <tc:Country>${offer.origin.country}</tc:Country>
          <tc:City>${offer.origin.city}</tc:City>
          <tc:PostalCode>${offer.origin.postalCode || ''}</tc:PostalCode>
          <tc:Date>${this.formatDate(offer.loadingDate)}</tc:Date>
        </tc:Loading>
        <tc:Unloading>
          <tc:Country>${offer.destination.country}</tc:Country>
          <tc:City>${offer.destination.city}</tc:City>
          <tc:PostalCode>${offer.destination.postalCode || ''}</tc:PostalCode>
          <tc:Date>${this.formatDate(offer.deliveryDate)}</tc:Date>
        </tc:Unloading>
        <tc:Cargo>
          <tc:Weight>${offer.weight || 0}</tc:Weight>
          <tc:WeightUnit>kg</tc:WeightUnit>
          <tc:LoadingMeters>${offer.loadingMeters || 0}</tc:LoadingMeters>
          <tc:Description>${offer.description || ''}</tc:Description>
        </tc:Cargo>
        <tc:VehicleRequirements>
          <tc:Type>${offer.vehicleType || 'TAUTLINER'}</tc:Type>
        </tc:VehicleRequirements>
        <tc:Price>
          <tc:Amount>${offer.price || 0}</tc:Amount>
          <tc:Currency>EUR</tc:Currency>
        </tc:Price>
        <tc:Contact>
          <tc:Email>${process.env.TIMOCOM_USER}</tc:Email>
        </tc:Contact>
      </tc:CargoOffer>
    </tc:StoreCargoOffer>`;

      const result = await this.sendSoapRequest('StoreCargoOffer', publishBody);

      return {
        success: true,
        offerId: result?.offerId || `TC-${Date.now()}`,
        message: 'Oferta publicada exitosamente en Timocom',
        offer
      };
    } catch (error) {
      console.error('❌ Error publicando oferta Timocom:', error.message);
      throw error;
    }
  }

  /**
   * 🚚 Buscar ofertas de vehículos/espacio de carga
   */
  async searchVehicleOffers(params) {
    console.log('🚚 Buscando vehículos en Timocom:', params);

    if (!this.user || !this.password) {
      return this.getMockVehicleOffers(params);
    }

    try {
      const searchBody = `
    <tc:FindTruckOffers>
      <tc:SearchCriteria>
        <tc:Location>
          <tc:Country>${params.country || 'ES'}</tc:Country>
          ${params.city ? `<tc:City>${params.city}</tc:City>` : ''}
          <tc:Radius>${params.radiusKm || 100}</tc:Radius>
        </tc:Location>
        <tc:DateRange>
          <tc:From>${this.formatDate(params.fromDate || new Date())}</tc:From>
          <tc:To>${this.formatDate(params.toDate || this.addDays(new Date(), 7))}</tc:To>
        </tc:DateRange>
        <tc:VehicleType>${params.vehicleType || ''}</tc:VehicleType>
        <tc:MaxResults>30</tc:MaxResults>
      </tc:SearchCriteria>
    </tc:FindTruckOffers>`;

      const result = await this.sendSoapRequest('FindTruckOffers', searchBody);
      return this.parseVehicleOffers(result);
    } catch (error) {
      console.error('❌ Error buscando vehículos Timocom:', error.message);
      return this.getMockVehicleOffers(params);
    }
  }

  /**
   * 🔄 Parsear ofertas de carga de respuesta SOAP
   */
  parseCargoOffers(soapResult) {
    try {
      const body = soapResult?.['soap:Envelope']?.['soap:Body'];
      const response = body?.['tc:FindCargoOffersResponse'];
      const offers = response?.['tc:CargoOffers']?.['tc:CargoOffer'];

      if (!offers) return [];

      const offerArray = Array.isArray(offers) ? offers : [offers];

      return offerArray.map(offer => ({
        id: offer?.['tc:OfferId'] || `TC-${Date.now()}`,
        source: 'timocom',
        origin: {
          country: offer?.['tc:Loading']?.['tc:Country'] || '',
          city: offer?.['tc:Loading']?.['tc:City'] || '',
          postalCode: offer?.['tc:Loading']?.['tc:PostalCode'] || '',
          date: offer?.['tc:Loading']?.['tc:Date'] || ''
        },
        destination: {
          country: offer?.['tc:Unloading']?.['tc:Country'] || '',
          city: offer?.['tc:Unloading']?.['tc:City'] || '',
          postalCode: offer?.['tc:Unloading']?.['tc:PostalCode'] || '',
          date: offer?.['tc:Unloading']?.['tc:Date'] || ''
        },
        cargo: {
          weight: parseFloat(offer?.['tc:Cargo']?.['tc:Weight']) || 0,
          loadingMeters: parseFloat(offer?.['tc:Cargo']?.['tc:LoadingMeters']) || 0,
          description: offer?.['tc:Cargo']?.['tc:Description'] || ''
        },
        vehicleType: offer?.['tc:VehicleRequirements']?.['tc:Type'] || 'TAUTLINER',
        price: {
          amount: parseFloat(offer?.['tc:Price']?.['tc:Amount']) || 0,
          currency: offer?.['tc:Price']?.['tc:Currency'] || 'EUR'
        },
        contact: {
          company: offer?.['tc:Contact']?.['tc:Company'] || '',
          email: offer?.['tc:Contact']?.['tc:Email'] || '',
          phone: offer?.['tc:Contact']?.['tc:Phone'] || ''
        },
        publishedAt: offer?.['tc:PublishedAt'] || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error parseando ofertas:', error.message);
      return [];
    }
  }

  /**
   * 🔄 Parsear ofertas de vehículos
   */
  parseVehicleOffers(soapResult) {
    try {
      const body = soapResult?.['soap:Envelope']?.['soap:Body'];
      const response = body?.['tc:FindTruckOffersResponse'];
      const offers = response?.['tc:TruckOffers']?.['tc:TruckOffer'];

      if (!offers) return [];

      const offerArray = Array.isArray(offers) ? offers : [offers];

      return offerArray.map(offer => ({
        id: offer?.['tc:OfferId'] || `TC-V-${Date.now()}`,
        source: 'timocom',
        type: 'vehicle',
        location: {
          country: offer?.['tc:Location']?.['tc:Country'] || '',
          city: offer?.['tc:Location']?.['tc:City'] || ''
        },
        availableFrom: offer?.['tc:AvailableFrom'] || '',
        availableTo: offer?.['tc:AvailableTo'] || '',
        vehicle: {
          type: offer?.['tc:Vehicle']?.['tc:Type'] || 'TAUTLINER',
          capacity: parseFloat(offer?.['tc:Vehicle']?.['tc:Capacity']) || 0,
          loadingMeters: parseFloat(offer?.['tc:Vehicle']?.['tc:LoadingMeters']) || 13.6
        },
        contact: {
          company: offer?.['tc:Contact']?.['tc:Company'] || '',
          email: offer?.['tc:Contact']?.['tc:Email'] || '',
          phone: offer?.['tc:Contact']?.['tc:Phone'] || ''
        }
      }));
    } catch (error) {
      console.error('Error parseando ofertas de vehículos:', error.message);
      return [];
    }
  }

  /**
   * 📋 Datos mock de ofertas de carga
   */
  getMockFreightOffers(params) {
    const mockOffers = [
      {
        id: 'TC-MOCK-001',
        source: 'timocom',
        origin: {
          country: params.originCountry || 'ES',
          city: params.originCity || 'Madrid',
          postalCode: '28001',
          date: this.formatDate(new Date())
        },
        destination: {
          country: params.destinationCountry || 'FR',
          city: params.destinationCity || 'París',
          postalCode: '75001',
          date: this.formatDate(this.addDays(new Date(), 2))
        },
        cargo: {
          weight: 18000,
          loadingMeters: 13.6,
          description: 'Pallets de mercancía general'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 1850,
          currency: 'EUR'
        },
        contact: {
          company: 'Transport Express SL',
          email: 'info@transportexpress.es',
          phone: '+34 91 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 1270,
        pricePerKm: 1.46
      },
      {
        id: 'TC-MOCK-002',
        source: 'timocom',
        origin: {
          country: 'ES',
          city: 'Barcelona',
          postalCode: '08001',
          date: this.formatDate(this.addDays(new Date(), 1))
        },
        destination: {
          country: 'DE',
          city: 'Múnich',
          postalCode: '80331',
          date: this.formatDate(this.addDays(new Date(), 3))
        },
        cargo: {
          weight: 22000,
          loadingMeters: 13.6,
          description: 'Productos industriales'
        },
        vehicleType: 'MEGA_TRAILER',
        price: {
          amount: 2100,
          currency: 'EUR'
        },
        contact: {
          company: 'Euro Logistics GmbH',
          email: 'dispatch@eurologistics.de',
          phone: '+49 89 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 1350,
        pricePerKm: 1.56
      },
      {
        id: 'TC-MOCK-003',
        source: 'timocom',
        origin: {
          country: 'FR',
          city: 'Lyon',
          postalCode: '69001',
          date: this.formatDate(new Date())
        },
        destination: {
          country: 'IT',
          city: 'Milán',
          postalCode: '20121',
          date: this.formatDate(this.addDays(new Date(), 1))
        },
        cargo: {
          weight: 15000,
          loadingMeters: 10,
          description: 'Textiles y confección'
        },
        vehicleType: 'TAUTLINER',
        price: {
          amount: 980,
          currency: 'EUR'
        },
        contact: {
          company: 'Italia Trans SpA',
          email: 'booking@italiatrans.it',
          phone: '+39 02 XXX XXXX'
        },
        publishedAt: new Date().toISOString(),
        distance: 480,
        pricePerKm: 2.04
      }
    ];

    // Filtrar por origen si se especifica
    return mockOffers.filter(offer => {
      if (params.originCountry && offer.origin.country !== params.originCountry) return false;
      if (params.destinationCountry && offer.destination.country !== params.destinationCountry) return false;
      return true;
    });
  }

  /**
   * 📋 Datos mock de ofertas de vehículos
   */
  getMockVehicleOffers(params) {
    return [
      {
        id: 'TC-V-MOCK-001',
        source: 'timocom',
        type: 'vehicle',
        location: {
          country: params.country || 'ES',
          city: params.city || 'Madrid'
        },
        availableFrom: this.formatDate(new Date()),
        availableTo: this.formatDate(this.addDays(new Date(), 5)),
        vehicle: {
          type: 'TAUTLINER',
          capacity: 24000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Transportes Rápidos SA',
          email: 'flota@transportesrapidos.es',
          phone: '+34 91 XXX XXXX'
        }
      },
      {
        id: 'TC-V-MOCK-002',
        source: 'timocom',
        type: 'vehicle',
        location: {
          country: 'ES',
          city: 'Valencia'
        },
        availableFrom: this.formatDate(this.addDays(new Date(), 1)),
        availableTo: this.formatDate(this.addDays(new Date(), 7)),
        vehicle: {
          type: 'MEGA_TRAILER',
          capacity: 25000,
          loadingMeters: 13.6
        },
        contact: {
          company: 'Mediterráneo Logistics',
          email: 'operaciones@medlogistics.es',
          phone: '+34 96 XXX XXXX'
        }
      }
    ];
  }

  /**
   * ⚠️ Manejar errores SOAP
   */
  handleSoapError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        return new Error('Credenciales Timocom inválidas');
      } else if (status === 403) {
        return new Error('Acceso denegado a Timocom API');
      } else if (status === 500) {
        return new Error('Error interno del servidor Timocom');
      }

      return new Error(`Error Timocom: ${status} - ${data}`);
    }

    return error;
  }

  /**
   * 📅 Formatear fecha para SOAP
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
      service: 'Timocom',
      status: this.user && this.password ? 'configured' : 'no_credentials',
      endpoint: this.baseUrl,
      user: this.user ? `${this.user.substring(0, 5)}...` : 'not_set',
      cache: {
        searches: this.cache.searches.size,
        offers: this.cache.offers.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TimocomService;
