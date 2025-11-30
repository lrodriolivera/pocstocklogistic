const express = require('express');
const router = express.Router();
const OpenRouteService = require('../services/openRouteService');

// Initialize OpenRouteService
const openRouteService = new OpenRouteService();

/**
 * @route   GET /api/geocode
 * @desc    Geocode a location to get coordinates
 * @access  Public
 */
router.get('/geocode', async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location parameter is required'
      });
    }

    // Use OpenRouteService for geocoding
    const url = `https://api.openrouteservice.org/geocode/search`;
    const params = new URLSearchParams({
      api_key: process.env.OPENROUTE_API_KEY,
      text: location,
      size: 1
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`OpenRouteService geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    const feature = data.features[0];
    const coordinates = feature.geometry.coordinates;

    res.json({
      success: true,
      location: location,
      latitude: coordinates[1],
      longitude: coordinates[0],
      fullName: feature.properties.label
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Error geocoding location',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/route
 * @desc    Get route between two points
 * @access  Public
 */
router.post('/route', async (req, res) => {
  try {
    const { start, end, profile = 'driving-hgv' } = req.body;

    console.log('Route request received:', { start, end, profile });

    if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
      return res.status(400).json({
        success: false,
        error: 'Start and end coordinates are required as arrays [lng, lat]'
      });
    }

    // Use OpenRouteService for routing
    const url = 'https://api.openrouteservice.org/v2/directions/' + profile;

    const requestBody = {
      coordinates: [start, end],
      format: 'geojson',
      instructions: false,
      elevation: false
    };

    console.log('Making request to OpenRouteService:', url);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': process.env.OPENROUTE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('OpenRouteService response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouteService error response:', errorText);
      throw new Error(`OpenRouteService routing failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenRouteService response data keys:', Object.keys(data));
    console.log('Full response structure:', JSON.stringify(data, null, 2));

    if (!data.routes || data.routes.length === 0) {
      console.log('No routes found in response');
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }

    const route = data.routes[0];
    console.log('Route structure keys:', Object.keys(route));
    console.log('Route geometry keys:', Object.keys(route.geometry || {}));

    const coordinates = route.geometry.coordinates;
    const summary = route.summary;

    console.log('Route found successfully, coordinates count:', coordinates.length);

    res.json({
      success: true,
      coordinates: coordinates,
      distance: Math.round(summary.distance / 1000), // Convert to km
      duration: Math.round(summary.duration / 60), // Convert to minutes
      profile: profile
    });

  } catch (error) {
    console.error('Routing error:', error);
    res.status(500).json({
      success: false,
      error: 'Error calculating route',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/map-status
 * @desc    Check map services status
 * @access  Public
 */
router.get('/map-status', (req, res) => {
  res.json({
    success: true,
    services: {
      openroute: {
        available: !!process.env.OPENROUTE_API_KEY,
        geocoding: true,
        routing: true,
        profiles: ['driving-hgv', 'driving-car', 'foot-walking']
      }
    },
    features: {
      geocoding: 'Convert addresses to coordinates',
      routing: 'Calculate routes between points',
      hgv_profile: 'Heavy goods vehicle routing'
    }
  });
});

module.exports = router;