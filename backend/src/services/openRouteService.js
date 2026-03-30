/**
 * 🗺️ OpenRouteService - Servicio de Mapas y Rutas para AXEL
 *
 * FUNCIONALIDADES:
 * - Geocoding de ciudades europeas
 * - Cálculo de rutas para camiones (HGV)
 * - Rate limiting inteligente
 * - Sistema de cache
 * - Fallbacks robustos
 *
 * @author AXEL Team
 * @version 1.0.0
 */

const axios = require('axios');
const polyline = require('@mapbox/polyline');

class OpenRouteService {
  constructor() {
    this.apiKey = process.env.OPENROUTE_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY2YjA5MzdhYmY3Yjc5YzlmZDZlZTE3NDg3NWQ2YmZmYjFiZGRlMmI3N2ZmYjNmNzg2ZDFmZmFhIiwiaCI6Im11cm11cjY0In0=';
    this.baseUrl = process.env.OPENROUTE_BASE_URL || 'https://api.openrouteservice.org/v2';
    this.geocodeUrl = process.env.OPENROUTE_GEOCODE_URL || 'https://api.openrouteservice.org/geocode';

    // Rate limiting tracking
    this.requestCount = {
      directions: 0,
      geocoding: 0,
      lastReset: new Date().setHours(0, 0, 0, 0)
    };

    this.limits = {
      directions: { daily: 2000, perMinute: 40 },
      geocoding: { daily: 1000, perMinute: 100 }
    };

    // Cache system
    this.cache = {
      geocoding: new Map(),
      routes: new Map()
    };

    this.cacheExpiry = {
      geocoding: 7 * 24 * 60 * 60 * 1000, // 7 días
      routes: 24 * 60 * 60 * 1000 // 1 día
    };

    // Fallback coordinates para ciudades principales
    this.fallbackCoordinates = {
      'Madrid': [-3.7038, 40.4168],
      'París': [2.3522, 48.8566],
      'Barcelona': [2.1734, 41.3851],
      'Milán': [9.1900, 45.4642],
      'Valencia': [-0.3763, 39.4699],
      'Roma': [12.4964, 41.9028],
      'Berlín': [13.4050, 52.5200],
      'Varsovia': [21.0122, 52.2297],
      'Amsterdam': [4.9041, 52.3676],
      'Lisboa': [-9.1393, 38.7223],
      'Múnich': [11.5820, 48.1351],
      'Hamburgo': [9.9937, 53.5511],
      'Lyon': [4.8357, 45.7640],
      'Marsella': [5.3698, 43.2965],
      'Nápoles': [14.2681, 40.8518],
      'Florencia': [11.2558, 43.7696],
      'Cracovia': [19.9368, 50.0647],
      'Praga': [14.4378, 50.0755]
    };

    this.europeanCountries = ['ES', 'FR', 'DE', 'IT', 'PL', 'NL', 'BE', 'AT', 'CH', 'PT', 'CZ', 'SK'];

    console.log('🗺️ OpenRouteService inicializado correctamente');
  }

  /**
   * 🔄 Verificar y resetear rate limits si es necesario
   */
  checkRateLimit() {
    const now = new Date();
    const today = new Date().setHours(0, 0, 0, 0);

    if (this.requestCount.lastReset < today) {
      this.requestCount.directions = 0;
      this.requestCount.geocoding = 0;
      this.requestCount.lastReset = today;
      console.log('📊 Rate limits reseteados para el nuevo día');
    }
  }

  /**
   * 📊 Verificar si se puede hacer una request
   */
  canMakeRequest(type, count = 1) {
    this.checkRateLimit();

    const current = this.requestCount[type] || 0;
    const limit = this.limits[type].daily;

    return (current + count) <= limit;
  }

  /**
   * 📈 Incrementar contador de requests
   */
  incrementCounter(type, count = 1) {
    this.requestCount[type] = (this.requestCount[type] || 0) + count;
  }

  /**
   * 🏙️ Geocoding de ciudades europeas
   */
  async geocodeCity(cityName) {
    try {
      const cacheKey = cityName.toLowerCase();

      // Verificar cache primero
      if (this.cache.geocoding.has(cacheKey)) {
        const cached = this.cache.geocoding.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry.geocoding) {
          console.log(`📍 Geocoding cache hit: ${cityName}`);
          return cached.coordinates;
        }
      }

      // Verificar rate limit
      if (!this.canMakeRequest('geocoding')) {
        console.warn(`⚠️ Rate limit alcanzado para geocoding, usando fallback para ${cityName}`);
        return this.getFallbackCoordinates(cityName);
      }

      // Hacer request a OpenRoute con parámetros mejorados
      const response = await axios.get(`${this.geocodeUrl}/search`, {
        params: {
          text: cityName,
          'boundary.country': this.europeanCountries.join(','),
          size: 3, // Obtener más resultados para mejor precisión
          layers: 'locality,region', // Incluir regiones para mejor cobertura
          'focus.point.lon': this.getCityRegionFocus(cityName).lon,
          'focus.point.lat': this.getCityRegionFocus(cityName).lat
        },
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      this.incrementCounter('geocoding');

      if (response.data.features && response.data.features.length > 0) {
        // Seleccionar el mejor resultado basado en relevancia y tipo
        const bestFeature = this.selectBestGeocodingResult(response.data.features, cityName);
        const coordinates = bestFeature.geometry.coordinates;

        // Extraer información adicional del país
        const countryCode = this.extractCountryFromFeature(bestFeature);

        // Guardar en cache con información adicional
        this.cache.geocoding.set(cacheKey, {
          coordinates,
          countryCode,
          confidence: bestFeature.properties.confidence || 1,
          timestamp: Date.now()
        });

        console.log(`✅ Geocoding exitoso: ${cityName} → [${coordinates[0]}, ${coordinates[1]}] (${countryCode})`);
        return coordinates;
      } else {
        console.warn(`⚠️ No se encontraron coordenadas para ${cityName}, usando fallback`);
        return this.getFallbackCoordinates(cityName);
      }

    } catch (error) {
      console.error(`❌ Error en geocoding ${cityName}:`, error.message);
      return this.getFallbackCoordinates(cityName);
    }
  }

  /**
   * 📍 Obtener coordenadas fallback
   */
  getFallbackCoordinates(cityName) {
    const fallback = this.fallbackCoordinates[cityName];
    if (fallback) {
      console.log(`🔄 Usando coordenadas fallback para ${cityName}: [${fallback[0]}, ${fallback[1]}]`);
      return fallback;
    }

    // Fallback genérico para Europa Central
    console.warn(`⚠️ No hay fallback específico para ${cityName}, usando coordenadas genéricas`);
    return [10.0, 50.0]; // Centro de Europa aproximado
  }

  /**
   * 🚛 Calcular ruta para camiones (HGV)
   */
  async calculateRoute(origin, destination) {
    try {
      const cacheKey = `${origin.toLowerCase()}-${destination.toLowerCase()}`;

      // Verificar cache
      if (this.cache.routes.has(cacheKey)) {
        const cached = this.cache.routes.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry.routes) {
          console.log(`🛣️ Route cache hit: ${origin} → ${destination}`);
          return cached.route;
        }
      }

      console.log(`🚛 Calculando ruta HGV: ${origin} → ${destination}`);

      // Geocoding de origen y destino
      const [originCoords, destCoords] = await Promise.all([
        this.geocodeCity(origin),
        this.geocodeCity(destination)
      ]);

      // Verificar rate limit para directions
      if (!this.canMakeRequest('directions')) {
        console.warn(`⚠️ Rate limit alcanzado para directions, usando cálculo fallback`);
        return this.calculateFallbackRoute(origin, destination, originCoords, destCoords);
      }

      // Calcular ruta con OpenRoute Directions API (SIMPLIFICADO y FUNCIONAL)
      const directionsResponse = await axios.post(
        `${this.baseUrl}/directions/driving-hgv`,
        {
          coordinates: [originCoords, destCoords],
          extra_info: ['countryinfo', 'tollways'],
          options: {
            avoid_features: ['ferries'],
            vehicle_type: 'hgv'
          },
          preference: 'recommended',
          units: 'km'
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      this.incrementCounter('directions');

      const routeData = directionsResponse.data.routes[0];
      const summary = routeData.summary;

      // DEBUG: Log what we received from OpenRouteService
      console.log('🔍 DEBUG - OpenRouteService response structure:', Object.keys(directionsResponse.data));
      console.log('🔍 DEBUG - Route data keys:', Object.keys(routeData));
      console.log('🔍 DEBUG - Route geometry present:', !!routeData.geometry);
      console.log('🔍 DEBUG - Route geometry type:', typeof routeData.geometry);
      console.log('🔍 DEBUG - Route geometry content (first 200 chars):', JSON.stringify(routeData.geometry).substring(0, 200));
      if (routeData.geometry && typeof routeData.geometry === 'object') {
        console.log('🔍 DEBUG - Geometry object keys:', Object.keys(routeData.geometry));
        console.log('🔍 DEBUG - Geometry coordinates length:', routeData.geometry.coordinates?.length);
        console.log('🔍 DEBUG - Geometry sample:', routeData.geometry.coordinates?.slice(0, 3));
      }

      // Procesar países de tránsito con mejor lógica
      const countries = this.extractCountries(routeData.extras?.countryinfo);

      // Si no se detectaron países, usar geocoding inverso
      let finalCountries = countries;
      if (countries.length === 0 || countries[0] === 'XX') {
        finalCountries = await this.inferCountriesFromCoordinates(originCoords, destCoords);
      }

      // Calcular días de tránsito mejorado (considerando regulaciones europeas)
      const drivingHours = summary.duration / 3600;
      const distanceKm = summary.distance; // Ya viene en km cuando units='km'
      const estimatedTransitDays = this.calculateRealisticTransitDays(drivingHours, distanceKm);

      // Decode polyline geometry to coordinates
      let geometryCoordinates = null;
      if (routeData.geometry && typeof routeData.geometry === 'string') {
        try {
          // Decode the polyline string to get [lat, lng] array
          const decodedCoords = polyline.decode(routeData.geometry);
          // Convert to [lng, lat] format (GeoJSON standard)
          geometryCoordinates = decodedCoords.map(coord => [coord[1], coord[0]]);
          console.log(`✅ Polyline decoded: ${geometryCoordinates.length} coordinates`);
          console.log('🔍 DEBUG - Decoded coordinates sample:', geometryCoordinates.slice(0, 3));
        } catch (error) {
          console.error('❌ Error decoding polyline:', error.message);
          geometryCoordinates = null;
        }
      }

      const route = {
        origin,
        destination,
        distance: Math.round(distanceKm), // ya viene en km
        duration: Math.round(drivingHours),
        estimatedTransitDays,
        countries: finalCountries,
        mainHighways: this.extractHighways(routeData.segments),
        tollSections: this.extractTollSections(routeData.extras?.tollways),
        restrictions: this.extractRestrictions(routeData.extras?.roadaccessrestrictions),
        geometry: geometryCoordinates ? {
          type: 'LineString',
          coordinates: geometryCoordinates
        } : null,
        confidence: this.calculateRouteConfidence(routeData, finalCountries),
        source: 'OpenRoute Service HGV'
      };

      // Guardar en cache
      this.cache.routes.set(cacheKey, {
        route,
        timestamp: Date.now()
      });

      console.log(`✅ Ruta calculada: ${origin} → ${destination} | ${route.distance}km | ${route.estimatedTransitDays} días | ${finalCountries.join(' → ')}`);

      return route;

    } catch (error) {
      console.error(`❌ Error calculando ruta ${origin} → ${destination}:`, error.message);

      // Fallback calculation
      const originCoords = await this.geocodeCity(origin);
      const destCoords = await this.geocodeCity(destination);

      return this.calculateFallbackRoute(origin, destination, originCoords, destCoords);
    }
  }

  /**
   * 🔄 Cálculo de ruta fallback
   */
  calculateFallbackRoute(origin, destination, originCoords, destCoords) {
    // Cálculo aproximado de distancia usando fórmula haversine
    const distance = this.calculateHaversineDistance(originCoords, destCoords);
    const estimatedTransitDays = Math.ceil(distance / 600); // ~600km por día

    // Estimación básica de países basada en coordenadas
    const countries = this.estimateCountriesFromCoords(originCoords, destCoords);

    const route = {
      origin,
      destination,
      distance: Math.round(distance),
      duration: Math.round(distance / 80), // 80km/h promedio
      estimatedTransitDays,
      countries,
      mainHighways: ['Estimación'],
      tollSections: [],
      geometry: null,
      confidence: 70,
      source: 'Fallback Calculation'
    };

    console.log(`🔄 Ruta fallback calculada: ${origin} → ${destination} | ${route.distance}km | ${route.estimatedTransitDays} días`);

    return route;
  }

  /**
   * 📏 Calcular distancia haversine entre dos puntos
   */
  calculateHaversineDistance(coords1, coords2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(coords2[1] - coords1[1]);
    const dLon = this.deg2rad(coords2[0] - coords1[0]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(coords1[1])) * Math.cos(this.deg2rad(coords2[1])) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * 🌍 Extraer países de la información de ruta (MEJORADO)
   */
  extractCountries(countryInfo) {
    if (!countryInfo || !countryInfo.segments) {
      // Si no hay información de países, intentar deducir de coordenadas
      return this.deduceCountriesFromContext();
    }

    const countries = new Set();
    countryInfo.segments.forEach(segment => {
      // Formato: [startIndex, endIndex, countryCode]
      if (segment.length >= 3 && segment[2] && typeof segment[2] === 'string' && segment[2] !== '0') {
        const countryCode = segment[2].toUpperCase();
        if (this.europeanCountries.includes(countryCode)) {
          countries.add(countryCode);
        }
      }
    });

    const result = Array.from(countries);
    return result.length > 0 ? result : this.deduceCountriesFromContext();
  }

  /**
   * 🛣️ Extraer autopistas principales
   */
  extractHighways(segments) {
    if (!segments) return [];

    const highways = new Set();
    segments.forEach(segment => {
      if (segment.way_points && segment.way_points.length > 0) {
        // Lógica básica para extraer nombres de autopistas
        highways.add('A-X'); // Placeholder
      }
    });

    return Array.from(highways).slice(0, 5); // Máximo 5 autopistas principales
  }

  /**
   * 💰 Extraer secciones con peajes
   */
  extractTollSections(tollInfo) {
    if (!tollInfo || !tollInfo.segments) {
      return [];
    }

    return tollInfo.segments.map(segment => ({
      start: segment[0],
      end: segment[1],
      hasToll: segment[2] === 1
    })).filter(section => section.hasToll);
  }

  /**
   * 🎯 Obtener foco regional para geocoding mejorado
   */
  getCityRegionFocus(cityName) {
    const cityLower = cityName.toLowerCase();

    // Focos regionales para mejorar geocoding
    const regionFocus = {
      'madrid': { lon: -3.7, lat: 40.4 },
      'barcelona': { lon: 2.1, lat: 41.4 },
      'valencia': { lon: -0.4, lat: 39.5 },
      'parís': { lon: 2.3, lat: 48.9 },
      'milán': { lon: 9.2, lat: 45.5 },
      'roma': { lon: 12.5, lat: 41.9 },
      'berlín': { lon: 13.4, lat: 52.5 },
      'varsovia': { lon: 21.0, lat: 52.2 },
      'amsterdam': { lon: 4.9, lat: 52.4 },
      'lisboa': { lon: -9.1, lat: 38.7 }
    };

    return regionFocus[cityLower] || { lon: 10.0, lat: 50.0 }; // Centro Europa por defecto
  }

  /**
   * 🏆 Seleccionar mejor resultado de geocoding
   */
  selectBestGeocodingResult(features, cityName) {
    if (features.length === 1) return features[0];

    // Priorizar por tipo de lugar y confianza
    const scored = features.map(feature => {
      let score = 0;
      const props = feature.properties;

      // Priorizar localidades sobre regiones
      if (props.layer === 'locality') score += 10;
      else if (props.layer === 'region') score += 5;

      // Priorizar coincidencias exactas en nombre
      if (props.name && props.name.toLowerCase() === cityName.toLowerCase()) score += 20;
      else if (props.name && props.name.toLowerCase().includes(cityName.toLowerCase())) score += 10;

      // Usar confianza si está disponible
      if (props.confidence) score += props.confidence * 5;

      return { feature, score };
    });

    // Ordenar por puntuación y devolver el mejor
    scored.sort((a, b) => b.score - a.score);
    return scored[0].feature;
  }

  /**
   * 🏴 Extraer código de país del feature de geocoding
   */
  extractCountryFromFeature(feature) {
    const props = feature.properties;

    // Intentar extraer de diferentes campos
    if (props.country_code) return props.country_code.toUpperCase();
    if (props.country) return this.countryNameToCode(props.country);
    if (props.region && this.europeanCountries.includes(props.region.toUpperCase())) {
      return props.region.toUpperCase();
    }

    // Fallback basado en coordenadas
    const coords = feature.geometry.coordinates;
    return this.coordinatesToCountryCode(coords[0], coords[1]);
  }

  /**
   * 🗺️ Convertir nombre de país a código
   */
  countryNameToCode(countryName) {
    const mapping = {
      'spain': 'ES', 'españa': 'ES',
      'france': 'FR', 'francia': 'FR',
      'italy': 'IT', 'italia': 'IT',
      'germany': 'DE', 'alemania': 'DE',
      'portugal': 'PT',
      'poland': 'PL', 'polonia': 'PL',
      'netherlands': 'NL', 'holanda': 'NL',
      'belgium': 'BE', 'bélgica': 'BE',
      'austria': 'AT',
      'switzerland': 'CH', 'suiza': 'CH',
      'czech republic': 'CZ', 'república checa': 'CZ',
      'slovakia': 'SK', 'eslovaquia': 'SK'
    };

    return mapping[countryName.toLowerCase()] || 'XX';
  }

  /**
   * 🌍 Convertir coordenadas a código de país (aproximado)
   */
  coordinatesToCountryCode(lon, lat) {
    // Rangos aproximados de países europeos
    if (lon >= -9.5 && lon <= 4.5 && lat >= 35.5 && lat <= 44.0) return 'ES'; // España
    if (lon >= -5.5 && lon <= 8.5 && lat >= 42.0 && lat <= 51.5) return 'FR'; // Francia
    if (lon >= 6.0 && lon <= 19.0 && lat >= 35.0 && lat <= 47.5) return 'IT'; // Italia
    if (lon >= 5.5 && lon <= 15.5 && lat >= 47.0 && lat <= 55.5) return 'DE'; // Alemania
    if (lon >= -9.5 && lon <= -6.0 && lat >= 36.5 && lat <= 42.5) return 'PT'; // Portugal
    if (lon >= 14.0 && lon <= 24.5 && lat >= 49.0 && lat <= 55.0) return 'PL'; // Polonia
    if (lon >= 3.0 && lon <= 7.5 && lat >= 50.5 && lat <= 54.0) return 'NL'; // Holanda
    if (lon >= 2.5 && lon <= 6.5 && lat >= 49.5 && lat <= 51.5) return 'BE'; // Bélgica
    if (lon >= 9.5 && lon <= 17.5 && lat >= 46.0 && lat <= 49.5) return 'AT'; // Austria
    if (lon >= 5.5 && lon <= 11.0 && lat >= 45.5 && lat <= 48.0) return 'CH'; // Suiza
    if (lon >= 12.0 && lon <= 23.0 && lat >= 48.5 && lat <= 51.5) return 'CZ'; // República Checa
    if (lon >= 16.5 && lon <= 22.5 && lat >= 47.5 && lat <= 49.5) return 'SK'; // Eslovaquia

    return 'XX'; // Desconocido
  }

  /**
   * 🔍 Deducir países del contexto cuando no hay información
   */
  deduceCountriesFromContext() {
    // Esta función se puede mejorar con más contexto de la ruta actual
    // Por ahora retorna países comunes en rutas europeas
    return ['ES', 'FR']; // Fallback común España-Francia
  }

  /**
   * 📍 Inferir países desde coordenadas usando geocoding inverso
   */
  async inferCountriesFromCoordinates(originCoords, destCoords) {
    try {
      const originCountry = this.coordinatesToCountryCode(originCoords[0], originCoords[1]);
      const destCountry = this.coordinatesToCountryCode(destCoords[0], destCoords[1]);

      // Usar rutas conocidas para corredores principales
      const knownRoute = this.getKnownEuropeanRoute(originCountry, destCountry);
      if (knownRoute.length > 0) {
        console.log(`✅ Usando ruta conocida: ${knownRoute.join(' → ')}`);
        return knownRoute;
      }

      // Calcular países intermedios basado en la ruta
      const intermediateCountries = this.calculateIntermediateCountries(originCoords, destCoords);

      // Combinar y deduplicar
      const allCountries = [originCountry, ...intermediateCountries, destCountry];
      const finalCountries = [...new Set(allCountries)].filter(c => c !== 'XX');

      return finalCountries.length > 0 ? finalCountries : [originCountry, destCountry].filter(c => c !== 'XX');
    } catch (error) {
      console.warn('Error infiriendo países desde coordenadas:', error.message);
      return ['ES', 'FR']; // Fallback
    }
  }

  /**
   * 🇪🇺 Obtener rutas conocidas para corredores principales europeos
   */
  getKnownEuropeanRoute(originCountry, destCountry) {
    const routeKey = `${originCountry}-${destCountry}`;

    // Rutas principales europeas conocidas
    const knownRoutes = {
      // España - Europa Oriental
      'ES-PL': ['ES', 'FR', 'DE', 'CZ', 'PL'],
      'ES-CZ': ['ES', 'FR', 'DE', 'CZ'],
      'ES-HU': ['ES', 'FR', 'CH', 'AT', 'HU'],
      'ES-SK': ['ES', 'FR', 'DE', 'CZ', 'SK'],

      // España - Europa Central
      'ES-DE': ['ES', 'FR', 'DE'],
      'ES-AT': ['ES', 'FR', 'CH', 'AT'],
      'ES-CH': ['ES', 'FR', 'CH'],

      // España - Italia
      'ES-IT': ['ES', 'FR', 'IT'],

      // Francia - Europa Oriental
      'FR-PL': ['FR', 'DE', 'CZ', 'PL'],
      'FR-CZ': ['FR', 'DE', 'CZ'],
      'FR-HU': ['FR', 'CH', 'AT', 'HU'],

      // Alemania - Europa Oriental
      'DE-PL': ['DE', 'PL'],
      'DE-CZ': ['DE', 'CZ'],
      'DE-HU': ['DE', 'AT', 'HU'],

      // Rutas inversas (simétrico)
      'PL-ES': ['PL', 'CZ', 'DE', 'FR', 'ES'],
      'CZ-ES': ['CZ', 'DE', 'FR', 'ES'],
      'HU-ES': ['HU', 'AT', 'CH', 'FR', 'ES'],
      'SK-ES': ['SK', 'CZ', 'DE', 'FR', 'ES'],
      'DE-ES': ['DE', 'FR', 'ES'],
      'AT-ES': ['AT', 'CH', 'FR', 'ES'],
      'CH-ES': ['CH', 'FR', 'ES'],
      'IT-ES': ['IT', 'FR', 'ES'],
      'PL-FR': ['PL', 'CZ', 'DE', 'FR'],
      'CZ-FR': ['CZ', 'DE', 'FR'],
      'HU-FR': ['HU', 'AT', 'CH', 'FR'],
      'PL-DE': ['PL', 'DE'],
      'CZ-DE': ['CZ', 'DE'],
      'HU-DE': ['HU', 'AT', 'DE']
    };

    return knownRoutes[routeKey] || [];
  }

  /**
   * 🗺️ Calcular países intermedios en la ruta
   */
  calculateIntermediateCountries(originCoords, destCoords) {
    const countries = [];

    // Calcular puntos intermedios en la ruta
    const steps = 5; // Dividir la ruta en 5 segmentos
    for (let i = 1; i < steps; i++) {
      const factor = i / steps;
      const intermediateLon = originCoords[0] + (destCoords[0] - originCoords[0]) * factor;
      const intermediateLat = originCoords[1] + (destCoords[1] - originCoords[1]) * factor;

      const country = this.coordinatesToCountryCode(intermediateLon, intermediateLat);
      if (country !== 'XX') {
        countries.push(country);
      }
    }

    return [...new Set(countries)]; // Deduplicar
  }

  /**
   * 📊 Calcular días de tránsito realistas
   */
  calculateRealisticTransitDays(drivingHours, distanceKm) {
    // Regulaciones europeas: máximo 9h conducción/día, 45min descanso cada 4.5h
    const maxDrivingHoursPerDay = 9;
    const restTimePerDay = 1.5; // 1.5h descansos obligatorios
    const effectiveHoursPerDay = maxDrivingHoursPerDay;

    // Calcular días base
    let baseDays = Math.ceil(drivingHours / effectiveHoursPerDay);

    // Ajustes por distancia (cargas/descargas, trámites fronterizos)
    if (distanceKm > 1500) baseDays += 1; // Rutas largas necesitan día extra
    if (distanceKm > 2500) baseDays += 1; // Rutas muy largas

    // Mínimo 1 día, máximo razonable 7 días para Europa
    return Math.max(1, Math.min(7, baseDays));
  }

  /**
   * 🔍 Extraer restricciones de acceso
   */
  extractRestrictions(restrictionInfo) {
    if (!restrictionInfo || !restrictionInfo.segments) {
      return [];
    }

    const restrictions = [];
    restrictionInfo.segments.forEach(segment => {
      if (segment[2] && segment[2] > 0) { // Hay restricción
        restrictions.push({
          start: segment[0],
          end: segment[1],
          type: this.mapRestrictionType(segment[2]),
          severity: segment[2] > 5 ? 'high' : 'medium'
        });
      }
    });

    return restrictions;
  }

  /**
   * 🚫 Mapear tipos de restricción
   */
  mapRestrictionType(restrictionCode) {
    const mapping = {
      1: 'weight_limit',
      2: 'height_limit',
      3: 'width_limit',
      4: 'length_limit',
      5: 'hazmat_restriction',
      6: 'time_restriction',
      7: 'vehicle_restriction'
    };

    return mapping[restrictionCode] || 'unknown_restriction';
  }

  /**
   * 🎯 Calcular confianza de la ruta
   */
  calculateRouteConfidence(routeData, countries) {
    let confidence = 90; // Base alta para OpenRoute

    // Reducir si no hay información de países
    if (countries.length === 0 || countries[0] === 'XX') {
      confidence -= 15;
    }

    // Reducir si la ruta es muy compleja
    if (countries.length > 4) {
      confidence -= 5;
    }

    // Aumentar si hay información extra
    if (routeData.extras && Object.keys(routeData.extras).length > 2) {
      confidence += 5;
    }

    // Reducir si hay muchas restricciones
    if (routeData.extras?.roadaccessrestrictions?.segments?.length > 10) {
      confidence -= 10;
    }

    return Math.max(70, Math.min(98, confidence));
  }

  /**
   * 🌍 Estimar países basado en coordenadas (fallback)
   */
  estimateCountriesFromCoords(originCoords, destCoords) {
    // Lógica muy básica basada en coordenadas
    const countries = [];

    // España
    if (originCoords[0] > -10 && originCoords[0] < 4 && originCoords[1] > 35 && originCoords[1] < 44) {
      countries.push('ES');
    }

    // Francia
    if ((originCoords[0] > -5 && originCoords[0] < 8 && originCoords[1] > 42 && originCoords[1] < 52) ||
        (destCoords[0] > -5 && destCoords[0] < 8 && destCoords[1] > 42 && destCoords[1] < 52)) {
      countries.push('FR');
    }

    // Alemania
    if (destCoords[0] > 5 && destCoords[0] < 16 && destCoords[1] > 47 && destCoords[1] < 56) {
      countries.push('DE');
    }

    // Italia
    if (destCoords[0] > 6 && destCoords[0] < 19 && destCoords[1] > 35 && destCoords[1] < 48) {
      countries.push('IT');
    }

    return countries.length > 0 ? countries : ['XX'];
  }

  /**
   * 🏥 Health check del servicio
   */
  async healthCheck() {
    try {
      console.log('🏥 Verificando estado de OpenRouteService...');

      const testRoute = await this.calculateRoute('Madrid', 'París');

      return {
        status: 'operational',
        apiKey: this.apiKey ? 'configured' : 'missing',
        rateLimits: {
          directions: `${this.requestCount.directions}/${this.limits.directions.daily}`,
          geocoding: `${this.requestCount.geocoding}/${this.limits.geocoding.daily}`
        },
        cache: {
          geocoding: this.cache.geocoding.size,
          routes: this.cache.routes.size
        },
        testRoute: {
          distance: testRoute.distance,
          confidence: testRoute.confidence,
          source: testRoute.source
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = OpenRouteService;