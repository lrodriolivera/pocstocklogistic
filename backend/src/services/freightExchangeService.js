/**
 * 🌐 Freight Exchange Aggregator Service
 *
 * Servicio unificado que agrega ofertas de múltiples bolsas de carga:
 * - Timocom (Europa)
 * - Wtransnet (Sur de Europa)
 *
 * Permite buscar y comparar ofertas de diferentes plataformas
 * en una única interfaz.
 *
 * @author Stock Logistic Team
 * @version 1.0.0
 */

const TimocomService = require('./timocomService');
const WtransnetService = require('./wtransnetService');

class FreightExchangeService {
  constructor() {
    this.timocom = new TimocomService();
    this.wtransnet = new WtransnetService();

    // Cache agregado
    this.cache = {
      aggregatedSearches: new Map()
    };

    this.cacheExpiry = 3 * 60 * 1000; // 3 minutos para búsquedas agregadas

    console.log('🌐 FreightExchangeService inicializado');
    console.log('   Plataformas activas: Timocom, Wtransnet');
  }

  /**
   * 🔍 Búsqueda agregada en todas las bolsas de carga
   *
   * @param {Object} params - Parámetros de búsqueda
   * @param {string[]} params.platforms - Plataformas a consultar ['timocom', 'wtransnet', 'all']
   * @param {string} params.originCountry - País de origen
   * @param {string} params.originCity - Ciudad de origen
   * @param {string} params.destinationCountry - País de destino
   * @param {string} params.destinationCity - Ciudad de destino
   * @param {number} params.radiusKm - Radio de búsqueda
   * @param {Date} params.fromDate - Fecha desde
   * @param {Date} params.toDate - Fecha hasta
   */
  async searchAllPlatforms(params) {
    const platforms = params.platforms || ['all'];
    const searchAll = platforms.includes('all');

    console.log('🔍 Búsqueda agregada en bolsas de carga:', {
      platforms: searchAll ? 'todas' : platforms,
      origin: `${params.originCity || ''}, ${params.originCountry || ''}`,
      destination: `${params.destinationCity || ''}, ${params.destinationCountry || ''}`
    });

    const results = {
      timocom: [],
      wtransnet: [],
      aggregated: [],
      metadata: {
        searchParams: params,
        timestamp: new Date().toISOString(),
        platforms: []
      }
    };

    // Ejecutar búsquedas en paralelo
    const promises = [];

    if (searchAll || platforms.includes('timocom')) {
      promises.push(
        this.timocom.searchFreightOffers(params)
          .then(offers => {
            results.timocom = offers;
            results.metadata.platforms.push('timocom');
          })
          .catch(err => {
            console.error('Error en Timocom:', err.message);
            results.timocom = [];
          })
      );
    }

    if (searchAll || platforms.includes('wtransnet')) {
      promises.push(
        this.wtransnet.searchFreightOffers(params)
          .then(offers => {
            results.wtransnet = offers;
            results.metadata.platforms.push('wtransnet');
          })
          .catch(err => {
            console.error('Error en Wtransnet:', err.message);
            results.wtransnet = [];
          })
      );
    }

    await Promise.all(promises);

    // Agregar y ordenar resultados
    results.aggregated = this.aggregateAndSort([
      ...results.timocom,
      ...results.wtransnet
    ]);

    results.metadata.totalOffers = results.aggregated.length;
    results.metadata.byPlatform = {
      timocom: results.timocom.length,
      wtransnet: results.wtransnet.length
    };

    return results;
  }

  /**
   * 🚚 Búsqueda agregada de vehículos disponibles
   */
  async searchVehicles(params) {
    const platforms = params.platforms || ['all'];
    const searchAll = platforms.includes('all');

    console.log('🚚 Búsqueda de vehículos:', params);

    const results = {
      timocom: [],
      wtransnet: [],
      aggregated: [],
      metadata: {
        searchParams: params,
        timestamp: new Date().toISOString()
      }
    };

    const promises = [];

    if (searchAll || platforms.includes('timocom')) {
      promises.push(
        this.timocom.searchVehicleOffers(params)
          .then(offers => { results.timocom = offers; })
          .catch(() => { results.timocom = []; })
      );
    }

    if (searchAll || platforms.includes('wtransnet')) {
      promises.push(
        this.wtransnet.searchVehicleOffers(params)
          .then(offers => { results.wtransnet = offers; })
          .catch(() => { results.wtransnet = []; })
      );
    }

    await Promise.all(promises);

    results.aggregated = [...results.timocom, ...results.wtransnet];
    results.metadata.totalVehicles = results.aggregated.length;

    return results;
  }

  /**
   * 📤 Publicar oferta en una o más plataformas
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
   * 🔄 Agregar y ordenar ofertas de múltiples fuentes
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
   * 📊 Obtener estadísticas del mercado
   */
  async getMarketStats(params = {}) {
    const allOffers = await this.searchAllPlatforms({
      ...params,
      platforms: ['all']
    });

    const offers = allOffers.aggregated;

    if (offers.length === 0) {
      return {
        message: 'No hay ofertas disponibles para los parámetros especificados',
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
   * 📈 Obtener rutas más populares
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
    const [timocomStatus, wtransnetStatus] = await Promise.all([
      this.timocom.healthCheck(),
      this.wtransnet.healthCheck()
    ]);

    return {
      service: 'FreightExchangeAggregator',
      status: 'operational',
      platforms: {
        timocom: timocomStatus,
        wtransnet: wtransnetStatus
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📋 Obtener información de plataformas disponibles
   */
  getPlatformsInfo() {
    return {
      platforms: [
        {
          id: 'timocom',
          name: 'Timocom',
          description: 'Bolsa de cargas líder en Europa',
          coverage: ['DE', 'FR', 'ES', 'IT', 'PL', 'NL', 'BE', 'AT', 'CH', 'CZ', 'SK', 'HU'],
          website: 'https://www.timocom.com',
          apiStatus: process.env.TIMOCOM_USER ? 'configured' : 'demo_mode'
        },
        {
          id: 'wtransnet',
          name: 'Wtransnet',
          description: 'Bolsa de cargas del sur de Europa',
          coverage: ['ES', 'PT', 'FR', 'IT', 'MA', 'AD'],
          website: 'https://www.wtransnet.com',
          apiStatus: process.env.WTRANSNET_USER ? 'credentials_ready' : 'demo_mode',
          note: 'API privada - acceso vía web'
        }
      ]
    };
  }
}

module.exports = FreightExchangeService;
