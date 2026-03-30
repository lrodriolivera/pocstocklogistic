/**
 * 🚛 Freight Exchange API Routes
 *
 * Endpoints para interactuar con bolsas de carga:
 * - Timocom (Europa)
 * - Wtransnet (Sur de Europa)
 * - Teleroute (Alpega Group - Europa Occidental)
 * - Trans.eu (Europa Central y del Este)
 * - Cargopedia (Europa del Este y del Sur)
 *
 * @author AXEL Team
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const FreightExchangeService = require('../services/freightExchangeService');

// Instancia del servicio agregador
const freightExchange = new FreightExchangeService();

/**
 * GET /api/freight-exchange/search
 *
 * Buscar ofertas de carga en todas las plataformas
 *
 * Query params:
 * - platforms: timocom,wtransnet,teleroute,transeu,cargopedia (o 'all')
 * - originCountry: ES, FR, DE, etc.
 * - originCity: Madrid, París, etc.
 * - destinationCountry: ES, FR, DE, etc.
 * - destinationCity: Madrid, París, etc.
 * - radiusKm: Radio de búsqueda (default: 50)
 * - fromDate: Fecha inicio (ISO)
 * - toDate: Fecha fin (ISO)
 */
router.get('/search', async (req, res) => {
  try {
    // Validate and clamp radiusKm
    let radiusKm = parseInt(req.query.radiusKm) || 50;
    radiusKm = Math.max(1, Math.min(500, radiusKm));

    // Validate dates
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : new Date();
    if (req.query.fromDate && isNaN(fromDate.getTime())) {
      return res.status(400).json({ success: false, error: 'fromDate invalido' });
    }
    const toDate = req.query.toDate ? new Date(req.query.toDate) : null;
    if (req.query.toDate && isNaN(toDate.getTime())) {
      return res.status(400).json({ success: false, error: 'toDate invalido' });
    }

    const params = {
      platforms: req.query.platforms ? req.query.platforms.split(',') : ['all'],
      originCountry: req.query.originCountry,
      originCity: req.query.originCity,
      destinationCountry: req.query.destinationCountry,
      destinationCity: req.query.destinationCity,
      radiusKm,
      fromDate,
      toDate
    };

    console.log('📡 API: Búsqueda de cargas', params);

    const results = await freightExchange.searchAllPlatforms(params);

    res.json({
      success: true,
      data: results,
      message: `Se encontraron ${results.metadata.totalOffers} ofertas`
    });
  } catch (error) {
    console.error('❌ Error en búsqueda de cargas:', error);
    res.status(500).json({
      success: false,
      error: 'Error en busqueda de cargas'
    });
  }
});

/**
 * GET /api/freight-exchange/vehicles
 *
 * Buscar vehículos disponibles
 */
router.get('/vehicles', async (req, res) => {
  try {
    const params = {
      platforms: req.query.platforms ? req.query.platforms.split(',') : ['all'],
      country: req.query.country,
      city: req.query.city,
      vehicleType: req.query.vehicleType,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate) : new Date(),
      toDate: req.query.toDate ? new Date(req.query.toDate) : null
    };

    console.log('📡 API: Búsqueda de vehículos', params);

    const results = await freightExchange.searchVehicles(params);

    res.json({
      success: true,
      data: results,
      message: `Se encontraron ${results.metadata.totalVehicles} vehículos disponibles`
    });
  } catch (error) {
    console.error('❌ Error en búsqueda de vehículos:', error);
    res.status(500).json({
      success: false,
      error: 'Error en busqueda de vehiculos'
    });
  }
});

/**
 * POST /api/freight-exchange/publish
 *
 * Publicar oferta de carga
 *
 * Body:
 * {
 *   platforms: ['timocom', 'wtransnet'],
 *   offer: {
 *     origin: { country, city, postalCode },
 *     destination: { country, city, postalCode },
 *     loadingDate: ISO date,
 *     deliveryDate: ISO date,
 *     weight: number (kg),
 *     loadingMeters: number,
 *     description: string,
 *     vehicleType: 'TAUTLINER' | 'MEGA_TRAILER' | 'FRIGORÍFICO',
 *     price: number (EUR)
 *   }
 * }
 */
router.post('/publish', async (req, res) => {
  try {
    const { platforms, offer } = req.body;

    if (!offer) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el objeto "offer" con los datos de la carga'
      });
    }

    console.log('📡 API: Publicar oferta', { platforms, offer });

    const result = await freightExchange.publishOffer(
      offer,
      platforms || ['timocom']
    );

    res.json({
      success: result.success.length > 0,
      data: result,
      message: result.success.length > 0
        ? `Oferta publicada en: ${result.success.join(', ')}`
        : 'No se pudo publicar la oferta'
    });
  } catch (error) {
    console.error('❌ Error publicando oferta:', error);
    res.status(500).json({
      success: false,
      error: 'Error publicando oferta'
    });
  }
});

/**
 * GET /api/freight-exchange/stats
 *
 * Obtener estadísticas del mercado
 */
router.get('/stats', async (req, res) => {
  try {
    const params = {
      originCountry: req.query.originCountry,
      destinationCountry: req.query.destinationCountry
    };

    const stats = await freightExchange.getMarketStats(params);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadisticas'
    });
  }
});

/**
 * GET /api/freight-exchange/platforms
 *
 * Obtener información de las plataformas disponibles
 */
router.get('/platforms', (req, res) => {
  try {
    const info = freightExchange.getPlatformsInfo();

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo informacion de plataformas'
    });
  }
});

/**
 * GET /api/freight-exchange/connection-status
 *
 * Check which platforms are live (real API) vs mock (demo data).
 * Shows required env vars for each platform.
 */
router.get('/connection-status', (req, res) => {
  try {
    const status = freightExchange.getConnectionStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error checking connection status' });
  }
});

/**
 * GET /api/freight-exchange/health
 *
 * Health check de los servicios de bolsas de carga
 */
router.get('/health', async (req, res) => {
  try {
    const health = await freightExchange.healthCheck();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error en health check'
    });
  }
});

module.exports = router;
