/**
 * 🌐 Freight Exchange Aggregator Service
 *
 * Servicio unificado que agrega ofertas de multiples bolsas de carga:
 * - Timocom (Europa)
 * - Wtransnet (Sur de Europa)
 * - Teleroute (Europa Occidental - Alpega Group)
 * - Trans.eu (Europa Central y del Este)
 * - Cargopedia (Europa del Este y del Sur)
 *
 * Permite buscar y comparar ofertas de diferentes plataformas
 * en una unica interfaz.
 *
 * @author AXEL Team
 * @version 3.0.0
 */

const TimocomService = require('./timocomService');
const WtransnetService = require('./wtransnetService');
const TelerouteService = require('./telerouteService');
const TranseuService = require('./transeuService');
const CargopediaService = require('./cargopediaService');

class FreightExchangeService {
  constructor() {
    this.timocom = new TimocomService();
    this.wtransnet = new WtransnetService();
    this.teleroute = new TelerouteService();
    this.transeu = new TranseuService();
    this.cargopedia = new CargopediaService();

    // Cache agregado
    this.cache = {
      aggregatedSearches: new Map()
    };

    this.cacheExpiry = 3 * 60 * 1000; // 3 minutos para busquedas agregadas

    console.log('🌐 FreightExchangeService inicializado');
    console.log('   Plataformas activas: Timocom, Wtransnet, Teleroute, Trans.eu, Cargopedia');
  }

  /**
   * 🔍 Busqueda agregada en todas las bolsas de carga
   *
   * @param {Object} params - Parametros de busqueda
   * @param {string[]} params.platforms - Plataformas a consultar ['timocom', 'wtransnet', 'teleroute', 'transeu', 'cargopedia', 'all']
   * @param {string} params.originCountry - Pais de origen
   * @param {string} params.originCity - Ciudad de origen
   * @param {string} params.destinationCountry - Pais de destino
   * @param {string} params.destinationCity - Ciudad de destino
   * @param {number} params.radiusKm - Radio de busqueda
   * @param {Date} params.fromDate - Fecha desde
   * @param {Date} params.toDate - Fecha hasta
   */
  async searchAllPlatforms(params) {
    const platforms = params.platforms || ['all'];
    const searchAll = platforms.includes('all');

    console.log('🔍 Busqueda agregada en bolsas de carga:', {
      platforms: searchAll ? 'todas' : platforms,
      origin: `${params.originCity || ''}, ${params.originCountry || ''}`,
      destination: `${params.destinationCity || ''}, ${params.destinationCountry || ''}`
    });

    const results = {
      timocom: [],
      wtransnet: [],
      teleroute: [],
      transeu: [],
      cargopedia: [],
      aggregated: [],
      metadata: {
        searchParams: params,
        timestamp: new Date().toISOString(),
        platforms: []
      }
    };

    // Construir array de promesas para busqueda en paralelo con Promise.allSettled
    const platformSearches = [];

    if (searchAll || platforms.includes('timocom')) {
      platformSearches.push({
        name: 'timocom',
        promise: this.timocom.searchFreightOffers(params)
      });
    }

    if (searchAll || platforms.includes('wtransnet')) {
      platformSearches.push({
        name: 'wtransnet',
        promise: this.wtransnet.searchFreightOffers(params)
      });
    }

    if (searchAll || platforms.includes('teleroute')) {
      platformSearches.push({
        name: 'teleroute',
        promise: this.teleroute.searchFreightOffers(params)
      });
    }

    if (searchAll || platforms.includes('transeu')) {
      platformSearches.push({
        name: 'transeu',
        promise: this.transeu.searchFreightOffers(params)
      });
    }

    if (searchAll || platforms.includes('cargopedia')) {
      platformSearches.push({
        name: 'cargopedia',
        promise: this.cargopedia.searchFreightOffers(params)
      });
    }

    // Ejecutar todas las busquedas en paralelo - una falla no afecta las demas
    const settled = await Promise.allSettled(
      platformSearches.map(p => p.promise)
    );

    // Procesar resultados
    settled.forEach((result, index) => {
      const platformName = platformSearches[index].name;
      if (result.status === 'fulfilled') {
        results[platformName] = result.value || [];
        results.metadata.platforms.push(platformName);
      } else {
        console.error(`Error en ${platformName}:`, result.reason?.message || result.reason);
        results[platformName] = [];
      }
    });

    // Agregar y ordenar resultados
    results.aggregated = this.aggregateAndSort([
      ...results.timocom,
      ...results.wtransnet,
      ...results.teleroute,
      ...results.transeu,
      ...results.cargopedia
    ]);

    results.metadata.totalOffers = results.aggregated.length;
    results.metadata.byPlatform = {
      timocom: results.timocom.length,
      wtransnet: results.wtransnet.length,
      teleroute: results.teleroute.length,
      transeu: results.transeu.length,
      cargopedia: results.cargopedia.length
    };

    return results;
  }

  /**
   * 🚚 Busqueda agregada de vehiculos disponibles
   */
  async searchVehicles(params) {
    const platforms = params.platforms || ['all'];
    const searchAll = platforms.includes('all');

    console.log('🚚 Busqueda de vehiculos:', params);

    const results = {
      timocom: [],
      wtransnet: [],
      teleroute: [],
      transeu: [],
      cargopedia: [],
      aggregated: [],
      metadata: {
        searchParams: params,
        timestamp: new Date().toISOString()
      }
    };

    const platformSearches = [];

    if (searchAll || platforms.includes('timocom')) {
      platformSearches.push({
        name: 'timocom',
        promise: this.timocom.searchVehicleOffers(params)
      });
    }

    if (searchAll || platforms.includes('wtransnet')) {
      platformSearches.push({
        name: 'wtransnet',
        promise: this.wtransnet.searchVehicleOffers(params)
      });
    }

    if (searchAll || platforms.includes('teleroute')) {
      platformSearches.push({
        name: 'teleroute',
        promise: this.teleroute.searchVehicleOffers(params)
      });
    }

    if (searchAll || platforms.includes('transeu')) {
      platformSearches.push({
        name: 'transeu',
        promise: this.transeu.searchVehicleOffers(params)
      });
    }

    if (searchAll || platforms.includes('cargopedia')) {
      platformSearches.push({
        name: 'cargopedia',
        promise: this.cargopedia.searchVehicleOffers(params)
      });
    }

    // Ejecutar todas las busquedas en paralelo
    const settled = await Promise.allSettled(
      platformSearches.map(p => p.promise)
    );

    // Procesar resultados
    settled.forEach((result, index) => {
      const platformName = platformSearches[index].name;
      if (result.status === 'fulfilled') {
        results[platformName] = result.value || [];
      } else {
        console.error(`Error vehiculos ${platformName}:`, result.reason?.message || result.reason);
        results[platformName] = [];
      }
    });

    results.aggregated = [
      ...results.timocom,
      ...results.wtransnet,
      ...results.teleroute,
      ...results.transeu,
      ...results.cargopedia
    ];
    results.metadata.totalVehicles = results.aggregated.length;

    return results;
  }

  /**
   * 📤 Publicar oferta en una o mas plataformas
   */
  async publishOffer(offer, platforms = ['timocom']) {
    console.log('📤 Publicando oferta:', { platforms, origin: offer.origin, destination: offer.destination });

    const results = {
      success: [],
      failed: [],
      details: {}
    };

    for (const platform of platforms) {
      try {
        let result;

        switch (platform) {
          case 'timocom':
            result = await this.timocom.publishFreightOffer(offer);
            break;
          case 'wtransnet':
            result = await this.wtransnet.publishFreightOffer(offer);
            break;
          case 'teleroute':
            result = await this.teleroute.publishFreightOffer(offer);
            break;
          case 'transeu':
            result = await this.transeu.publishFreightOffer(offer);
            break;
          case 'cargopedia':
            result = await this.cargopedia.publishFreightOffer(offer);
            break;
          default:
            throw new Error(`Plataforma no soportada: ${platform}`);
        }

        results.success.push(platform);
        results.details[platform] = result;
      } catch (error) {
        results.failed.push(platform);
        results.details[platform] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * 🔄 Agregar y ordenar ofertas de multiples fuentes
   */
  aggregateAndSort(offers) {
    // Eliminar duplicados potenciales (mismo origen-destino-fecha)
    const uniqueOffers = this.removeDuplicates(offers);

    // Ordenar por precio por km (mejor valor primero)
    return uniqueOffers.sort((a, b) => {
      const pricePerKmA = a.pricePerKm || (a.price?.amount / (a.distance || 1));
      const pricePerKmB = b.pricePerKm || (b.price?.amount / (b.distance || 1));
      return pricePerKmA - pricePerKmB;
    });
  }

  /**
   * 🔄 Eliminar ofertas duplicadas
   */
  removeDuplicates(offers) {
    const seen = new Set();

    return offers.filter(offer => {
      const key = `${offer.origin?.country}-${offer.origin?.city}-${offer.destination?.country}-${offer.destination?.city}-${offer.price?.amount}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  /**
   * 📊 Obtener estadisticas del mercado
   */
  async getMarketStats(params = {}) {
    const allOffers = await this.searchAllPlatforms({
      ...params,
      platforms: ['all']
    });

    const offers = allOffers.aggregated;

    if (offers.length === 0) {
      return {
        message: 'No hay ofertas disponibles para los parametros especificados',
        params
      };
    }

    const prices = offers.map(o => o.price?.amount || 0).filter(p => p > 0);
    const pricesPerKm = offers.map(o => o.pricePerKm || 0).filter(p => p > 0);

    return {
      totalOffers: offers.length,
      byPlatform: allOffers.metadata.byPlatform,
      priceStats: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        currency: 'EUR'
      },
      pricePerKmStats: {
        min: Math.min(...pricesPerKm).toFixed(2),
        max: Math.max(...pricesPerKm).toFixed(2),
        avg: (pricesPerKm.reduce((a, b) => a + b, 0) / pricesPerKm.length).toFixed(2)
      },
      topRoutes: this.getTopRoutes(offers),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📈 Obtener rutas mas populares
   */
  getTopRoutes(offers) {
    const routeCounts = {};

    offers.forEach(offer => {
      const route = `${offer.origin?.country || 'XX'} → ${offer.destination?.country || 'XX'}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });

    return Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));
  }

  /**
   * 🏥 Health check de todas las plataformas
   */
  async healthCheck() {
    const [timocomStatus, wtransnetStatus, telerouteStatus, transeuStatus, cargopediaStatus] = await Promise.all([
      this.timocom.healthCheck(),
      this.wtransnet.healthCheck(),
      this.teleroute.healthCheck(),
      this.transeu.healthCheck(),
      this.cargopedia.healthCheck()
    ]);

    return {
      service: 'FreightExchangeAggregator',
      status: 'operational',
      platforms: {
        timocom: timocomStatus,
        wtransnet: wtransnetStatus,
        teleroute: telerouteStatus,
        transeu: transeuStatus,
        cargopedia: cargopediaStatus
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔌 Get connection status of each platform (live vs mock)
   * Returns which platforms have real API credentials configured
   * and which are running in demo/mock mode.
   */
  getConnectionStatus() {
    const platforms = {
      timocom: {
        live: !!(process.env.TIMOCOM_USER && process.env.TIMOCOM_PASSWORD),
        envVars: ['TIMOCOM_USER', 'TIMOCOM_PASSWORD'],
        apiType: 'SOAP v2',
        docs: 'https://developer.timocom.com/'
      },
      wtransnet: {
        live: !!(process.env.WTRANSNET_USER && process.env.WTRANSNET_PASSWORD),
        envVars: ['WTRANSNET_USER', 'WTRANSNET_PASSWORD'],
        apiType: 'No public API (web scraping)',
        docs: 'https://www.wtransnet.com'
      },
      teleroute: {
        live: !!(process.env.TELEROUTE_CLIENT_ID && process.env.TELEROUTE_CLIENT_SECRET),
        envVars: ['TELEROUTE_CLIENT_ID', 'TELEROUTE_CLIENT_SECRET'],
        apiType: 'REST JWT',
        docs: 'https://www.teleroute.com/en/digital-freight-exchange/api'
      },
      transeu: {
        live: !!(process.env.TRANSEU_CLIENT_ID && process.env.TRANSEU_CLIENT_SECRET && process.env.TRANSEU_API_KEY),
        envVars: ['TRANSEU_CLIENT_ID', 'TRANSEU_CLIENT_SECRET', 'TRANSEU_API_KEY'],
        apiType: 'REST Bearer + APIKey',
        docs: 'https://developers.trans.eu/'
      },
      cargopedia: {
        live: !!(process.env.CARGOPEDIA_API_KEY && process.env.CARGOPEDIA_USER_ID),
        envVars: ['CARGOPEDIA_API_KEY', 'CARGOPEDIA_USER_ID'],
        apiType: 'REST APIKey',
        docs: 'https://www.cargopedia.net'
      }
    };

    const liveCount = Object.values(platforms).filter(p => p.live).length;

    return {
      summary: {
        total: 5,
        live: liveCount,
        mock: 5 - liveCount,
        status: liveCount === 5 ? 'all_live' : liveCount > 0 ? 'partial' : 'all_mock'
      },
      platforms
    };
  }

  /**
   * 📋 Obtener informacion de plataformas disponibles
   */
  getPlatformsInfo() {
    return {
      platforms: [
        {
          id: 'timocom',
          name: 'Timocom',
          description: 'Bolsa de cargas lider en Europa',
          coverage: ['DE', 'FR', 'ES', 'IT', 'PL', 'NL', 'BE', 'AT', 'CH', 'CZ', 'SK', 'HU'],
          website: 'https://www.timocom.com',
          apiStatus: process.env.TIMOCOM_USER ? 'configured' : 'demo_mode',
          offersPerDay: '750,000+',
          color: 'blue'
        },
        {
          id: 'wtransnet',
          name: 'Wtransnet',
          description: 'Bolsa de cargas del sur de Europa',
          coverage: ['ES', 'PT', 'FR', 'IT', 'MA', 'AD'],
          website: 'https://www.wtransnet.com',
          apiStatus: process.env.WTRANSNET_USER ? 'credentials_ready' : 'demo_mode',
          offersPerDay: '100,000+',
          note: 'API privada - acceso via web',
          color: 'orange'
        },
        {
          id: 'teleroute',
          name: 'Teleroute',
          description: 'Alpega Group - Europa Occidental',
          coverage: ['ES', 'FR', 'BE', 'NL', 'LU', 'DE', 'IT', 'PT', 'CH', 'AT', 'GB'],
          website: 'https://www.teleroute.com',
          apiStatus: process.env.TELEROUTE_API_KEY ? 'configured' : 'demo_mode',
          offersPerDay: '350,000+',
          color: 'green'
        },
        {
          id: 'transeu',
          name: 'Trans.eu',
          description: 'Plataforma logistica lider en Europa Central y del Este',
          coverage: ['PL', 'DE', 'CZ', 'SK', 'HU', 'RO', 'BG', 'LT', 'LV', 'EE', 'AT', 'ES', 'FR', 'IT', 'NL', 'BE', 'DK', 'SE'],
          website: 'https://www.trans.eu',
          apiStatus: (process.env.TRANSEU_API_KEY && process.env.TRANSEU_CLIENT_SECRET) ? 'configured' : 'demo_mode',
          offersPerDay: '400,000+',
          color: 'purple'
        },
        {
          id: 'cargopedia',
          name: 'Cargopedia',
          description: 'Bolsa de cargas de Europa del Este y del Sur',
          coverage: ['RO', 'BG', 'TR', 'GR', 'HU', 'PL', 'CZ', 'SK', 'RS', 'HR', 'SI', 'MD', 'UA'],
          website: 'https://www.cargopedia.net',
          apiStatus: process.env.CARGOPEDIA_API_KEY ? 'configured' : 'demo_mode',
          offersPerDay: '150,000+',
          color: 'red'
        }
      ]
    };
  }
}

module.exports = FreightExchangeService;
