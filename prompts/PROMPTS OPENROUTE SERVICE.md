# 🗺️ PROMPTS OPENROUTE SERVICE INTEGRATION
## Stock Logistic POC - Sistema de Cotizaciones Inteligente

**API Key Configurada**: `eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY3MDE5YWQ3ZTlkZTQxNmQ4YjNjODc0MjQ4ZTUwM2YxIiwiaCI6Im11cm11cjY0In0=`

**Límites Confirmados**: 
- Directions: 2000/día, 40/min ✅
- Geocoding: 1000/día, 100/min ✅

---

## 🚀 PROMPT #3A: SERVICIO OPENROUTE CORE

```markdown
Necesito implementar el servicio principal de OpenRoute Service para el sistema de cotizaciones Stock Logistic POC.

CONTEXTO DEL PROYECTO:
- Sistema de cotizaciones inteligente para transporte terrestre
- Especialización en productos forestales
- Rutas europeas (España, Francia, Alemania, Italia, Polonia, etc.)
- Integración con LUC1-COMEX AI para análisis
- Estimaciones POC: 20-50 cotizaciones/día = ~150 requests/día

API KEY OPENROUTE:
eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY3MDE5YWQ3ZTlkZTQxNmQ4YjNjODc0MjQ4ZTUwM2YxIiwiaCI6Im11cm11cjY0In0=

LÍMITES CONFIRMADOS:
- Directions V2: 2000/día, 40/minuto
- Geocode Search: 1000/día, 100/minuto  
- Matrix V2: 500/día, 40/minuto

ARCHIVO OBJETIVO: backend/src/services/openRouteService.js

FUNCIONALIDADES REQUERIDAS:

1. **CONFIGURACIÓN Y AUTENTICACIÓN**
   - Base URL: https://api.openrouteservice.org/v2
   - Geocoding URL: https://api.openrouteservice.org/geocode
   - Headers correctos con Authorization
   - Manejo de errores HTTP específicos

2. **GEOCODING DE CIUDADES EUROPEAS**
   - Convertir nombres de ciudades a coordenadas [lon, lat]
   - Filtros por países: ES,FR,DE,IT,PL,NL,BE,AT,CH
   - Cache agresivo (7 días TTL) para optimizar requests
   - Fallback a coordenadas conocidas si falla API

3. **CÁLCULO DE RUTAS PARA CAMIONES**
   - Profile: 'driving-hgv' (Heavy Good Vehicle)
   - Extra info: ['countryinfo', 'tollways', 'surface']
   - Avoid features: ['ferries']
   - Vehicle type: 'hgv'
   - Parsing de países de tránsito
   - Detección de tramos con peajes

4. **RATE LIMITING INTELIGENTE**
   - Tracking de requests diarios y por minuto
   - Prevención de exceder límites
   - Reset automático a medianoche
   - Logs de uso para monitoreo

5. **SISTEMA DE CACHE**
   - Cache de geocoding: 7 días
   - Cache de rutas: 1 día 
   - Implementar con Map() en memoria
   - Keys basados en origen-destino

CASOS DE PRUEBA OBLIGATORIOS:
1. Madrid → París (1270km, ES→FR)
2. Barcelona → Milán (875km, ES→FR→IT, túneles alpinos)  
3. Valencia → Roma (1350km, ES→FR→IT, ruta costera)
4. Sevilla → Varsovia (2847km, ES→FR→DE→PL, ruta larga)

ESTRUCTURA DE RESPUESTA ESPERADA:
```javascript
{
  origin: 'Madrid',
  destination: 'París',
  distance: 1270, // km
  duration: 18, // horas
  estimatedTransitDays: 3, // días (considerando 8h/día conducción)
  countries: ['ES', 'FR'],
  mainHighways: ['A-2', 'A-9', 'A-6'], // extraídos de geometry
  tollSections: [...], // de extra_info tollways
  geometry: {...}, // Para visualización mapas
  confidence: 95,
  source: 'OpenRoute Service HGV'
}
```

MANEJO DE ERRORES:
- Rate limit exceeded → usar cache + log warning
- Geocoding failed → usar fallback coordinates
- Route failed → return fallback route con menor confidence
- Network error → retry con backoff exponential

FALLBACK DATA:
Incluir coordenadas de emergencia para ciudades principales:
- Madrid: [-3.7038, 40.4168]
- París: [2.3522, 48.8566]  
- Barcelona: [2.1734, 41.3851]
- Milán: [9.1900, 45.4642]
- Valencia: [-0.3763, 39.4699]
- Roma: [12.4964, 41.9028]
- Berlín: [13.4050, 52.5200]
- Varsovia: [21.0122, 52.2297]

INTEGRACIÓN CON PROYECTO:
- Export como module.exports = OpenRouteService
- Constructor sin parámetros (usa variables de entorno)
- Métodos async/await
- Logging con console.log para debugging
- Compatible con calculationEngine.js existente

Por favor implementa el servicio completo con todas las funcionalidades, manejo de errores robusto, y los casos de prueba validados.
```

---

## 🔧 PROMPT #3B: CONFIGURACIÓN VARIABLES DE ENTORNO

```markdown
Necesito actualizar la configuración de variables de entorno para incluir OpenRoute Service en el proyecto Stock Logistic POC.

CONTEXTO:
- Proyecto ya tiene estructura backend/frontend configurada
- Variables de entorno en backend/.env
- OpenRoute Service será la API principal de mapas
- API Key ya disponible y funcional

ARCHIVOS A MODIFICAR:

1. **backend/.env.example** - Agregar sección OpenRoute
2. **backend/.env** - Configuración real (si existe)
3. **backend/src/config/apis.js** - Configuración centralizada APIs

VARIABLES REQUERIDAS:

```env
# ===== MAPAS Y RUTAS - OPENROUTE SERVICE =====
OPENROUTE_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY3MDE5YWQ3ZTlkZTQxNmQ4YjNjODc0MjQ4ZTUwM2YxIiwiaCI6Im11cm11cjY0In0=
OPENROUTE_BASE_URL=https://api.openrouteservice.org/v2
OPENROUTE_GEOCODE_URL=https://api.openrouteservice.org/geocode

# Rate Limits (para monitoreo)
OPENROUTE_DIRECTIONS_DAILY=2000
OPENROUTE_DIRECTIONS_MINUTE=40
OPENROUTE_GEOCODING_DAILY=1000
OPENROUTE_GEOCODING_MINUTE=100
```

ARCHIVO DE CONFIGURACIÓN: backend/src/config/apis.js

```javascript
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
  
  // Mantener configuraciones existentes de otras APIs
  luc1: {
    endpoint: process.env.LUC1_ENDPOINT,
    token: process.env.HUGGING_FACE_TOKEN
  }
  
  // ... otras APIs
};

module.exports = apisConfig;
```

VALIDACIÓN DE CONFIGURACIÓN:
- Verificar que OPENROUTE_API_KEY no esté vacía
- Confirmar URLs accesibles
- Logging de configuración en startup
- Health check endpoint para verificar conectividad

ACTUALIZACIÓN APP.JS:
Agregar en el health check endpoint información de OpenRoute:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Stock Logistic POC Backend',
    apis: {
      luc1: process.env.LUC1_ENDPOINT ? 'Configured' : 'Missing',
      openroute: process.env.OPENROUTE_API_KEY ? 'Configured' : 'Missing',
      // ... otras APIs
    },
    timestamp: new Date().toISOString()
  });
});
```

Por favor actualiza todos los archivos de configuración con las variables de OpenRoute Service.
```

---

## 📍 PROMPT #3C: INTEGRACIÓN CON CALCULATION ENGINE

```markdown
Necesito integrar el servicio OpenRoute Service con el motor de cálculo principal del sistema Stock Logistic POC.

CONTEXTO:
- OpenRouteService ya implementado en backend/src/services/openRouteService.js
- CalculationEngine existente en backend/src/services/calculationEngine.js
- LUC1Service requiere datos de ruta reales para análisis inteligente
- El flujo debe ser: OpenRoute → datos de ruta → LUC1 análisis → cotización final

ARCHIVO OBJETIVO: backend/src/services/calculationEngine.js

INTEGRACIÓN REQUERIDA:

1. **IMPORTACIÓN Y INICIALIZACIÓN**
   - Importar OpenRouteService
   - Inicializar en constructor de CalculationEngine
   - Manejo de errores si OpenRoute no disponible

2. **FLUJO DE CÁLCULO ACTUALIZADO**
```javascript
async generateCompleteQuote(quoteRequest) {
  // PASO 1: Calcular ruta real con OpenRoute (HGV)
  const routeData = await this.openRouteService.calculateRoute(
    quoteRequest.route.origin,
    quoteRequest.route.destination
  );
  
  // PASO 2: Usar datos reales para análisis LUC1
  const luc1Analysis = await this.luc1Service.analyzeTransportistPrices({
    routeData, // ← Datos reales con países, distancia, tiempo
    quoteRequest
  });
  
  // PASO 3: Generar cotización con datos precisos
  return this.buildFinalQuote(routeData, luc1Analysis, quoteRequest);
}
```

3. **PROCESAMIENTO DE DATOS DE RUTA**
   - Extraer países para restricciones posteriores
   - Calcular días de tránsito realistas (8h conducción/día)
   - Identificar tramos con peajes para TollGuru
   - Detectar rutas complejas (>3 países, montañas, etc.)

4. **GENERACIÓN DE ALTERNATIVAS BASADAS EN RUTA REAL**
```javascript
generateServiceAlternatives(baseRoute, luc1Analysis) {
  const alternatives = [
    {
      type: 'Económica',
      price: Math.round(luc1Analysis.finalPrice * 0.85),
      transitTime: baseRoute.estimatedTransitDays + 1,
      description: `Grupaje ${baseRoute.distance}km vía ${baseRoute.countries.join('→')}`,
      features: ['Grupaje', 'Flexibilidad fechas', 'Económico']
    },
    {
      type: 'Estándar',
      price: luc1Analysis.finalPrice,
      transitTime: baseRoute.estimatedTransitDays,
      description: `Recomendación IA - ${baseRoute.countries.length} países`,
      features: ['Carga completa', 'Recomendado IA', 'Ruta optimizada'],
      recommended: true
    },
    {
      type: 'Express',
      price: Math.round(luc1Analysis.finalPrice * 1.25),
      transitTime: Math.max(1, baseRoute.estimatedTransitDays - 1),
      description: 'Entrega prioritaria directa',
      features: ['Directo', 'Prioritario', 'Sin paradas adicionales']
    }
  ];
  
  return alternatives;
}
```

5. **DETECCIÓN DE ALERTAS BASADA EN RUTA**
```javascript
generateRouteAlerts(routeData, quoteRequest) {
  const alerts = [];
  
  // Alertas por complejidad de ruta
  if (routeData.countries.length > 3) {
    alerts.push({
      type: 'warning',
      message: `Ruta compleja: tránsito por ${routeData.countries.length} países`,
      impact: 'medium'
    });
  }
  
  // Alertas por distancia
  if (routeData.distance > 2000) {
    alerts.push({
      type: 'info',
      message: `Ruta larga: ${routeData.distance}km, considerar conductor de relevo`,
      impact: 'low'
    });
  }
  
  // Alertas por países específicos
  if (routeData.countries.includes('CH')) {
    alerts.push({
      type: 'warning',
      message: 'Tránsito por Suiza: viñeta y restricciones nocturnas aplicables',
      impact: 'high'
    });
  }
  
  // Alertas por rutas alpinas
  if (routeData.countries.includes('IT') && routeData.countries.includes('FR')) {
    alerts.push({
      type: 'info',  
      message: 'Ruta alpina: túneles Mont Blanc/Fréjus disponibles',
      impact: 'medium'
    });
  }
  
  return alerts;
}
```

6. **RESPONSE STRUCTURE INTEGRADA**
```javascript
buildFinalQuote(routeData, luc1Analysis, quoteRequest) {
  return {
    quoteId: this.generateQuoteId(),
    timestamp: new Date().toISOString(),
    confidence: Math.min(routeData.confidence, luc1Analysis.confidence),
    validUntil: this.calculateValidUntil(),
    
    route: {
      origin: routeData.origin,
      destination: routeData.destination,
      distance: routeData.distance,
      estimatedTransitDays: routeData.estimatedTransitDays,
      countries: routeData.countries,
      mainHighways: routeData.mainHighways,
      source: routeData.source
    },
    
    costBreakdown: {
      // Usar distancia real de OpenRoute
      distanceRate: Math.round(routeData.distance * 0.75), // €0.75/km base
      // ... resto de costos
    },
    
    alternatives: this.generateServiceAlternatives(routeData, luc1Analysis),
    alerts: [
      ...this.generateRouteAlerts(routeData, quoteRequest),
      ...luc1Analysis.alerts
    ],
    
    intelligence: {
      routeSource: 'OpenRoute Service HGV',
      aiAnalysis: luc1Analysis.reasoning,
      routeConfidence: routeData.confidence,
      countries: routeData.countries.length
    }
  };
}
```

7. **ERROR HANDLING Y FALLBACKS**
   - Si OpenRoute falla → usar coordenadas fallback + cálculo estimado
   - Si ruta no viable → sugerir alternativas
   - Logging detallado de errores para debugging

CASOS DE PRUEBA A VALIDAR:
1. Madrid→París: Debe usar datos reales OpenRoute en LUC1 analysis
2. Barcelona→Milán: Debe detectar túneles alpinos y generar alertas
3. Error OpenRoute: Debe usar fallback sin romper el flujo

Por favor integra OpenRouteService completamente en el CalculationEngine manteniendo la compatibilidad con el resto del sistema.
```

---

## 🎯 PROMPT #3D: FRONTEND INTEGRATION & VISUALIZACIÓN

```markdown
Necesito integrar OpenRoute Service en el frontend para visualización de rutas y validación en tiempo real.

CONTEXTO:
- Frontend React ya configurado con formulario de cotización
- Backend OpenRoute Service funcionando
- Necesidad de mostrar rutas en mapa para mejorar UX
- Validación automática de rutas mientras usuario escribe

ARCHIVOS A CREAR/MODIFICAR:

1. **frontend/src/services/openRouteService.js** - Cliente frontend
2. **frontend/src/components/RouteMap/RouteMap.jsx** - Mapa de rutas  
3. **frontend/src/components/QuoteForm/RouteSelector.jsx** - Selector con validación
4. **frontend/src/hooks/useRouteValidation.js** - Hook validación rutas

FUNCIONALIDADES FRONTEND:

1. **CLIENTE OPENROUTE FRONTEND**
```javascript
// frontend/src/services/openRouteService.js
class OpenRouteServiceClient {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENROUTE_API_KEY;
    this.baseUrl = 'https://api.openrouteservice.org/v2';
  }

  async validateRoute(origin, destination) {
    try {
      // Llamada directa a OpenRoute desde frontend para validación rápida
      const response = await fetch('/api/routes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination })
      });
      
      return await response.json();
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async getRouteGeometry(origin, destination) {
    // Para visualización en mapa
    const response = await fetch('/api/routes/geometry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination })
    });
    
    return await response.json();
  }
}
```

2. **COMPONENTE MAPA DE RUTAS**
```jsx
// frontend/src/components/RouteMap/RouteMap.jsx
import React, { useEffect, useRef } from 'react';

const RouteMap = ({ route, geometry }) => {
  const mapRef = useRef(null);
  
  useEffect(() => {
    if (!route || !geometry) return;
    
    // Implementar mapa básico con Leaflet o similar
    // Mostrar origen, destino y ruta calculada
    // Highlight países de tránsito
    
    console.log(`Mostrando ruta: ${route.origin} → ${route.destination}`);
    console.log(`Distancia: ${route.distance}km, Países: ${route.countries.join(' → ')}`);
  }, [route, geometry]);

  return (
    <div className="route-map bg-gray-100 rounded-lg p-4 mb-4">
      <div ref={mapRef} className="h-64 w-full bg-blue-50 rounded flex items-center justify-center">
        {route ? (
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-800">
              {route.origin} → {route.destination}
            </div>
            <div className="text-sm text-blue-600">
              {route.distance}km • {route.estimatedTransitDays} días • {route.countries.join(' → ')}
            </div>
            <div className="text-xs text-blue-500 mt-2">
              Powered by OpenRoute Service HGV
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Selecciona origen y destino para ver la ruta</div>
        )}
      </div>
    </div>
  );
};

export default RouteMap;
```

3. **SELECTOR DE RUTA CON VALIDACIÓN**
```jsx
// Modificación del componente RouteSelector existente
import { useRouteValidation } from '../../hooks/useRouteValidation';

const RouteSelector = ({ value, onChange }) => {
  const { validateRoute, validationState, routePreview } = useRouteValidation();

  const handleOriginChange = async (newOrigin) => {
    onChange({ ...value, origin: newOrigin });
    
    if (newOrigin && value.destination) {
      await validateRoute(newOrigin, value.destination);
    }
  };

  const handleDestinationChange = async (newDestination) => {
    onChange({ ...value, destination: newDestination });
    
    if (value.origin && newDestination) {
      await validateRoute(value.origin, newDestination);
    }
  };

  return (
    <div className="route-selector space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selector Origen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Origen *
          </label>
          <select 
            value={value.origin || ''}
            onChange={(e) => handleOriginChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar origen...</option>
            {EUROPEAN_CITIES.map(city => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector Destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destino *
          </label>
          <select 
            value={value.destination || ''}
            onChange={(e) => handleDestinationChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar destino...</option>
            {EUROPEAN_CITIES.map(city => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Validación de Ruta */}
      {validationState.isValidating && (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm">Validando ruta...</span>
        </div>
      )}

      {validationState.isValid && routePreview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-green-800">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Ruta válida</span>
          </div>
          <div className="mt-2 text-sm text-green-700">
            <div>Distancia: {routePreview.distance}km</div>
            <div>Tiempo estimado: {routePreview.estimatedTransitDays} días</div>
            <div>Países: {routePreview.countries.join(' → ')}</div>
          </div>
        </div>
      )}

      {validationState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-red-800">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Error en ruta</span>
          </div>
          <div className="mt-1 text-sm text-red-700">
            {validationState.error}
          </div>
        </div>
      )}
    </div>
  );
};
```

4. **HOOK VALIDACIÓN DE RUTAS**
```javascript
// frontend/src/hooks/useRouteValidation.js
import { useState } from 'react';
import { openRouteService } from '../services/openRouteService';

export const useRouteValidation = () => {
  const [validationState, setValidationState] = useState({
    isValidating: false,
    isValid: null,
    error: null
  });
  
  const [routePreview, setRoutePreview] = useState(null);

  const validateRoute = async (origin, destination) => {
    if (!origin || !destination) {
      setValidationState({ isValidating: false, isValid: null, error: null });
      setRoutePreview(null);
      return;
    }

    setValidationState({ isValidating: true, isValid: null, error: null });

    try {
      const result = await openRouteService.validateRoute(origin, destination);
      
      if (result.valid) {
        setValidationState({ isValidating: false, isValid: true, error: null });
        setRoutePreview(result.route);
      } else {
        setValidationState({ 
          isValidating: false, 
          isValid: false, 
          error: result.error || 'Ruta no disponible' 
        });
        setRoutePreview(null);
      }
    } catch (error) {
      setValidationState({ 
        isValidating: false, 
        isValid: false, 
        error: 'Error validando ruta' 
      });
      setRoutePreview(null);
    }
  };

  return {
    validateRoute,
    validationState,
    routePreview
  };
};
```

5. **BACKEND ENDPOINT PARA VALIDACIÓN RÁPIDA**
```javascript
// backend/src/controllers/routeController.js
const OpenRouteService = require('../services/openRouteService');

class RouteController {
  constructor() {
    this.openRouteService = new OpenRouteService();
  }

  async validateRoute(req, res) {
    try {
      const { origin, destination } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          error: 'Origin and destination required'
        });
      }

      const route = await this.openRouteService.calculateRoute(origin, destination);
      
      res.json({
        success: true,
        valid: true,
        route: {
          origin: route.origin,
          destination: route.destination,
          distance: route.distance,
          estimatedTransitDays: route.estimatedTransitDays,
          countries: route.countries
        }
      });
    } catch (error) {
      res.json({
        success: false,
        valid: false,
        error: error.message
      });
    }
  }
}

module.exports = RouteController;
```

INTEGRACIÓN EN QUOTEFORM PRINCIPAL:
- Agregar RouteMap component después del RouteSelector
- Mostrar preview de ruta antes de generar cotización completa
- Disable botón "Generar Cotización" hasta que ruta sea válida

Por favor implementa la integración frontend completa de OpenRoute Service con validación en tiempo real y visualización básica de rutas.
```

---

## ✅ PROMPT #3E: TESTING Y VALIDACIÓN FINAL

```markdown
Necesito crear testing completo para la integración OpenRoute Service en el proyecto Stock Logistic POC.

CONTEXTO:
- OpenRoute Service integrado en backend y frontend
- API Key: eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY3MDE5YWQ3ZTlkZTQxNmQ4YjNjODc0MjQ4ZTUwM2YxIiwiaCI6Im11cm11cjY0In0=
- Límites: 2000 directions/día, 1000 geocoding/día
- Casos específicos Stock Logistic a validar

ARCHIVOS DE TESTING:

1. **backend/src/__tests__/services/openRouteService.test.js**
2. **backend/src/__tests__/integration/route-calculation.test.js**
3. **frontend/src/__tests__/services/openRouteService.test.js**
4. **e2e-tests/route-validation.spec.js**

CASOS DE PRUEBA OBLIGATORIOS:

1. **TESTING SERVICIO BACKEND**
```javascript
describe('OpenRoute Service Integration', () => {
  let openRouteService;

  beforeAll(() => {
    openRouteService = new OpenRouteService();
  });

  describe('Geocoding Tests', () => {
    test('Should geocode Madrid correctly', async () => {
      const coords = await openRouteService.geocodeCity('Madrid');
      
      expect(coords).toBeDefined();
      expect(coords).toHaveLength(2);
      expect(coords[0]).toBeCloseTo(-3.7038, 1); // lon
      expect(coords[1]).toBeCloseTo(40.4168, 1); // lat
    });

    test('Should geocode París correctly', async () => {
      const coords = await openRouteService.geocodeCity('París');
      
      expect(coords[0]).toBeCloseTo(2.3522, 1);
      expect(coords[1]).toBeCloseTo(48.8566, 1);
    });

    test('Should handle invalid city with fallback', async () => {
      const coords = await openRouteService.geocodeCity('InvalidCity123');
      
      expect(coords).toBeDefined();
      expect(coords).toHaveLength(2);
    });
  });

  describe('Route Calculation Tests', () => {
    test('Should calculate Madrid → París route correctly', async () => {
      const route = await openRouteService.calculateRoute('Madrid', 'París');
      
      expect(route.origin).toBe('Madrid');
      expect(route.destination).toBe('París');
      expect(route.distance).toBeGreaterThan(1200);
      expect(route.distance).toBeLessThan(1400);
      expect(route.countries).toContain('ES');
      expect(route.countries).toContain('FR');
      expect(route.estimatedTransitDays).toBeGreaterThan(1);
      expect(route.confidence).toBeGreaterThan(90);
    });

    test('Should calculate Barcelona → Milán route with Alpine info', async () => {
      const route = await openRouteService.calculateRoute('Barcelona', 'Milán');
      
      expect(route.countries).toEqual(expect.arrayContaining(['ES', 'FR', 'IT']));
      expect(route.distance).toBeGreaterThan(800);
      expect(route.distance).toBeLessThan(1000);
    });

    test('Should calculate long route Sevilla → Varsovia', async () => {
      const route = await openRouteService.calculateRoute('Sevilla', 'Varsovia');
      
      expect(route.countries.length).toBeGreaterThanOrEqual(4);
      expect(route.distance).toBeGreaterThan(2500);
      expect(route.estimatedTransitDays).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Rate Limiting Tests', () => {
    test('Should track request counts correctly', () => {
      const initialDirections = openRouteService.requestCount.directions || 0;
      
      // Simulate request
      openRouteService.incrementCounter('directions');
      
      expect(openRouteService.requestCount.directions).toBe(initialDirections + 1);
    });

    test('Should prevent requests when limit reached', () => {
      // Set artificial limit
      openRouteService.requestCount.directions = 2000;
      
      const canMake = openRouteService.canMakeRequest('directions', 1);
      expect(canMake).toBe(false);
    });
  });

  describe('Error Handling Tests', () => {
    test('Should handle network errors gracefully', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const route = await openRouteService.calculateRoute('Madrid', 'París');
      
      expect(route).toBeDefined();
      expect(route.source).toContain('Fallback');
      
      global.fetch = originalFetch;
    });

    test('Should use fallback coordinates when geocoding fails', async () => {
      const coords = await openRouteService.geocodeCity('NonExistentCity');
      
      expect(coords).toBeDefined();
      expect(coords).toHaveLength(2);
    });
  });
});
```

2. **TESTING INTEGRACIÓN CON CALCULATION ENGINE**
```javascript
describe('Route Integration with Calculation Engine', () => {
  let calculationEngine;

  beforeAll(() => {
    calculationEngine = new CalculationEngine();
  });

  test('Should generate complete quote using OpenRoute data', async () => {
    const quoteRequest = {
      route: { origin: 'Madrid', destination: 'París' },
      cargo: { type: 'Madera y productos forestales', weight: 15000 },
      service: { level: 'Estándar', pickupDate: '2025-10-15' },
      client: { name: 'Test Client', email: 'test@test.com' }
    };

    const quote = await calculationEngine.generateCompleteQuote(quoteRequest);

    expect(quote).toBeDefined();
    expect(quote.route.distance).toBeGreaterThan(1200);
    expect(quote.route.countries).toContain('ES');
    expect(quote.route.countries).toContain('FR');
    expect(quote.intelligence.routeSource).toContain('OpenRoute');
    expect(quote.alternatives).toHaveLength(3);
  }, 15000);

  test('Should handle route-specific alerts correctly', async () => {
    const complexRouteRequest = {
      route: { origin: 'Madrid', destination: 'Varsovia' },
      cargo: { type: 'Mercancía general', weight: 20000 },
      service: { level: 'Estándar', pickupDate: '2025-10-20' }
    };

    const quote = await calculationEngine.generateCompleteQuote(complexRouteRequest);

    expect(quote.alerts.some(alert => 
      alert.message.includes('países') || alert.message.includes('compleja')
    )).toBe(true);
  }, 15000);
});
```

3. **TESTING FRONTEND**
```javascript
describe('Frontend OpenRoute Integration', () => {
  test('Should validate route correctly', async () => {
    const client = new OpenRouteServiceClient();
    const result = await client.validateRoute('Madrid', 'París');
    
    expect(result.valid).toBe(true);
    expect(result.route.distance).toBeGreaterThan(1000);
  });

  test('Should handle invalid routes', async () => {
    const client = new OpenRouteServiceClient();
    const result = await client.validateRoute('InvalidCity', 'AnotherInvalidCity');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

4. **TESTING E2E COMPLETO**
```javascript
describe('End-to-End Route Flow', () => {
  test('Complete quote generation flow with OpenRoute', async () => {
    // 1. Abrir aplicación
    await page.goto('http://localhost:3000');
    
    // 2. Seleccionar origen y destino
    await page.selectOption('[data-testid="origin-select"]', 'Madrid');
    await page.selectOption('[data-testid="destination-select"]', 'París');
    
    // 3. Esperar validación automática de ruta
    await page.waitForSelector('[data-testid="route-valid"]', { timeout: 10000 });
    
    // 4. Verificar preview de ruta
    const routePreview = await page.textContent('[data-testid="route-preview"]');
    expect(routePreview).toContain('1270km');
    expect(routePreview).toContain('ES → FR');
    
    // 5. Completar formulario y generar cotización
    await page.fill('[data-testid="cargo-weight"]', '15000');
    await page.selectOption('[data-testid="cargo-type"]', 'Madera y productos forestales');
    await page.fill('[data-testid="client-name"]', 'Test Client');
    await page.fill('[data-testid="client-email"]', 'test@test.com');
    
    await page.click('[data-testid="generate-quote"]');
    
    // 6. Verificar cotización generada con datos OpenRoute
    await page.waitForSelector('[data-testid="quote-result"]', { timeout: 15000 });
    
    const quoteDistance = await page.textContent('[data-testid="quote-distance"]');
    expect(quoteDistance).toContain('1270');
    
    const quoteCountries = await page.textContent('[data-testid="quote-countries"]');
    expect(quoteCountries).toContain('ES');
    expect(quoteCountries).toContain('FR');
  }, 30000);
});
```

5. **PERFORMANCE Y MONITORING TESTS**
```javascript
describe('OpenRoute Performance Tests', () => {
  test('Should complete route calculation under 5 seconds', async () => {
    const start = Date.now();
    
    const route = await openRouteService.calculateRoute('Madrid', 'París');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
    expect(route).toBeDefined();
  });

  test('Should handle 10 concurrent route calculations', async () => {
    const requests = Array(10).fill().map(() => 
      openRouteService.calculateRoute('Barcelona', 'Roma')
    );

    const results = await Promise.all(requests);
    
    results.forEach(result => {
      expect(result.distance).toBeGreaterThan(800);
      expect(result.confidence).toBeGreaterThan(90);
    });
  }, 15000);

  test('Should not exceed daily rate limits during normal usage', () => {
    // Simulate POC usage: 50 quotes/day = ~150 requests
    const dailyUsage = {
      directions: 50,
      geocoding: 100
    };

    expect(dailyUsage.directions).toBeLessThan(2000);
    expect(dailyUsage.geocoding).toBeLessThan(1000);
  });
});
```

COMANDOS DE TESTING:
```bash
# Backend testing
cd backend
npm test -- openRouteService
npm test -- --testPathPattern=integration

# Frontend testing
cd frontend  
npm test -- openRouteService

# E2E testing
npm run test:e2e

# Performance testing
npm run test:performance
```

MÉTRICAS DE ÉXITO:
- ✅ Todas las rutas principales (Madrid-París, Barcelona-Milán, etc.) calculadas correctamente
- ✅ Geocoding preciso para ciudades europeas
- ✅ Rate limiting respetado
- ✅ Error handling robusto
- ✅ Performance < 5 segundos por ruta
- ✅ Integración completa con CalculationEngine

Por favor implementa toda la suite de testing para validar que OpenRoute Service funciona perfectamente en el proyecto Stock Logistic POC.
```

---

## 🚀 **RESUMEN DE IMPLEMENTACIÓN**

### **ORDEN DE EJECUCIÓN DE PROMPTS:**
1. **#3A** → Servicio OpenRoute Core 
2. **#3B** → Configuración variables de entorno
3. **#3C** → Integración con Calculation Engine
4. **#3D** → Frontend integration & visualización
5. **#3E** → Testing y validación final

### **VALIDACIÓN FINAL:**
- ✅ API Key confirmada y funcional
- ✅ Límites más que suficientes para POC y producción
- ✅ Profile `driving-hgv` para camiones disponible
- ✅ Geocoding y extra_info incluidos en plan gratuito
- ✅ Integración completa backend/frontend
- ✅ Testing exhaustivo implementado

**¡Listo para implementar OpenRoute Service como API principal de mapas en Stock Logistic POC!** 🗺️
