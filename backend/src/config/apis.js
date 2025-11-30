/**
 * 🔧 Configuración centralizada de APIs
 * Stock Logistic POC
 */

const apisConfig = {
  openroute: {
    apiKey: process.env.OPENROUTE_API_KEY,
    baseUrl: process.env.OPENROUTE_BASE_URL || 'https://api.openrouteservice.org/v2',
    geocodeUrl: process.env.OPENROUTE_GEOCODE_URL || 'https://api.openrouteservice.org/geocode',

    limits: {
      directions: {
        daily: parseInt(process.env.OPENROUTE_DIRECTIONS_DAILY) || 2000,
        perMinute: parseInt(process.env.OPENROUTE_DIRECTIONS_MINUTE) || 40
      },
      geocoding: {
        daily: parseInt(process.env.OPENROUTE_GEOCODING_DAILY) || 1000,
        perMinute: parseInt(process.env.OPENROUTE_GEOCODING_MINUTE) || 100
      }
    },

    profiles: ['driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'],
    defaultProfile: 'driving-hgv',

    europeCountries: ['ES', 'FR', 'DE', 'IT', 'PL', 'NL', 'BE', 'AT', 'CH', 'PT', 'CZ', 'SK'],

    fallbackCoordinates: {
      'Madrid': [-3.7038, 40.4168],
      'París': [2.3522, 48.8566],
      'Barcelona': [2.1734, 41.3851],
      'Milán': [9.1900, 45.4642],
      'Valencia': [-0.3763, 39.4699],
      'Roma': [12.4964, 41.9028],
      'Berlín': [13.4050, 52.5200],
      'Varsovia': [21.0122, 52.2297],
      'Amsterdam': [4.9041, 52.3676],
      'Lisboa': [-9.1393, 38.7223]
    }
  },

  luc1: {
    endpoint: process.env.LUC1_ENDPOINT || 'https://lrodriolivera-luc1-comex-inference.hf.space',
    token: process.env.HUGGING_FACE_TOKEN
  },

  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  },

  tollguru: {
    apiKey: process.env.TOLLGURU_API_KEY,
    baseUrl: process.env.TOLLGURU_BASE_URL || 'https://apis.tollguru.com/toll/v2',
    endpoint: '/origin-destination-waypoints',
    monthlyLimit: parseInt(process.env.TOLLGURU_MONTHLY_LIMIT) || 5000,
    enableCache: process.env.TOLLGURU_ENABLE_CACHE !== 'false',

    // Configuración específica para vehículos comerciales
    defaultVehicle: {
      type: 'truck',
      weight: 20, // toneladas
      axles: 3,
      height: 4, // metros
      emissionClass: 'euro6'
    },

    // Países europeos con cobertura TollGuru
    supportedCountries: ['ES', 'FR', 'IT', 'DE', 'AT', 'CH', 'NL', 'BE', 'PL', 'CZ', 'SK', 'PT', 'SI', 'HU'],

    // Rate limiting
    cache: {
      enabled: true,
      expiryHours: 24,
      maxSize: 1000
    }
  },

  globalPetrolPrices: {
    apiKey: process.env.GLOBALPETROLPRICES_API_KEY
  },

  external: {
    dgtEndpoint: process.env.DGT_API_ENDPOINT || 'https://nap-pre.dgt.es/en/dataset',
    holidaysApi: process.env.EUROPEAN_HOLIDAYS_API || 'https://date.nager.at/api/v3'
  }
};

module.exports = apisConfig;