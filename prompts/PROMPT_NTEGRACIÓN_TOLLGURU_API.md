# 🛣️ PROMPT CLAUDE CODE: INTEGRACIÓN TOLLGURU API
## Sistema Stock Logistic POC - Cálculo Preciso de Peajes Europeos

```
Necesito que implementes la integración completa de TollGuru API para cálculo preciso de peajes en el proyecto Stock Logistic POC.

CONTEXTO DEL PROYECTO:
- Sistema de cotizaciones inteligente para transporte terrestre
- Backend Node.js + Express ya configurado
- OpenRoute Service YA IMPLEMENTADO en backend/src/services/openRouteService.js
- LUC1-COMEX AI YA IMPLEMENTADO en backend/src/services/luc1Service.js
- CalculationEngine YA IMPLEMENTADO en backend/src/services/calculationEngine.js
- Stack: MongoDB + Redis + React frontend

OBJETIVO:
Crear servicio TollGuru que reciba polylines de OpenRoute Service y calcule peajes exactos para camiones en rutas europeas, integrándose perfectamente con el flujo existente.

API TOLLGURU ESPECIFICACIONES:
- Base URL: https://apis.tollguru.com/toll/v2
- Endpoint: /complete-polyline-from-mapping-service
- Autenticación: Header 'x-api-key' con API key
- Método: POST con polyline + parámetros vehículo
- Cobertura: 48 países europeos

IMPLEMENTACIÓN REQUERIDA:

1. CREAR ARCHIVO: backend/src/services/tollGuruService.js

FUNCIONALIDADES PRINCIPALES:
- calculateTollsFromPolyline(polyline, vehicleSpecs) → calcular peajes desde polyline OpenRoute
- getTollBreakdown(routeData, vehicleConfig) → desglose detallado por país
- handleFallback() → manejo errores con estimaciones base
- cacheManager() → cache 24h para optimizar requests

PARÁMETROS VEHÍCULO COMERCIAL:
- vehicleType: 'truck'
- weight: 15-40 toneladas
- axles: 2-5 ejes
- height: 3-4.5 metros
- emissionClass: 'euro6' por defecto
- source: 'openrouteservice'

2. INTEGRAR EN: backend/src/services/calculationEngine.js

MODIFICAR MÉTODO EXISTENTE generateCompleteQuote():
- Después de OpenRoute calcular ruta
- Llamar TollGuru con polyline obtenida
- Usar datos reales en análisis LUC1
- Incluir peajes exactos en costBreakdown

3. CASOS DE PRUEBA OBLIGATORIOS:

RUTA 1: Madrid → París
- Vehículo: 20t, 3 ejes, Euro6
- Esperado: €45-65 total (ES: €20-25, FR: €25-40)
- Validación: Desglose por países correcto

RUTA 2: Barcelona → Milán  
- Vehículo: 25t, 4 ejes
- Esperado: €85-120 (incluir túneles alpinos)
- Validación: Detectar peajes especiales

RUTA 3: Valencia → Roma
- Vehículo: 18t, 3 ejes
- Esperado: €95-130 total
- Validación: Ruta costera España-Francia-Italia

4. ESTRUCTURA RESPUESTA ESPERADA:

```javascript
{
  route: {
    origin: 'Madrid',
    destination: 'París',
    totalDistance: 1270,
    countries: ['ES', 'FR']
  },
  tolls: {
    totalCost: 58.40,
    currency: 'EUR',
    breakdown: [
      {
        country: 'ES', 
        cost: 23.40,
        tollPlazas: ['AP-2 Zaragoza', 'AP-68 Logroño'],
        segments: [
          {name: 'AP-2 Madrid-Zaragoza', cost: 15.20},
          {name: 'AP-68 Zaragoza-Bilbao', cost: 8.20}
        ]
      },
      {
        country: 'FR',
        cost: 35.00, 
        tollPlazas: ['A-9 Montpellier', 'A-6 Paris'],
        segments: [...]
      }
    ],
    vignettes: [], // Para Austria, Suiza, etc.
    specialTolls: [] // Túneles, puentes especiales
  },
  vehicle: {
    type: 'truck',
    weight: 20,
    axles: 3,
    height: 4,
    emissionClass: 'euro6'
  },
  confidence: 95,
  source: 'TollGuru API',
  timestamp: '2025-09-23T10:30:00Z'
}
```

5. MANEJO DE ERRORES:
- Rate limit exceeded → usar cache + log warning
- Polyline inválida → regenerar con OpenRoute  
- País sin datos → usar tarifas promedio históricas
- Error red → fallback estimaciones base sin romper flujo

6. CONFIGURACIÓN VARIABLES DE ENTORNO:

Añadir a backend/.env.example:
```
# ===== PEAJES - TOLLGURU API =====
TOLLGURU_API_KEY=your_tollguru_api_key_here
TOLLGURU_BASE_URL=https://apis.tollguru.com/toll/v2
TOLLGURU_MONTHLY_LIMIT=5000
TOLLGURU_ENABLE_CACHE=true
```

7. INTEGRACIÓN CALCULATION ENGINE:

Modificar método generateCompleteQuote() para incluir:
```javascript
// Después de obtener routeData de OpenRoute
const tollData = await this.tollGuruService.calculateTollsFromPolyline(
  routeData.geometry,
  this.getVehicleSpecs(quoteRequest.cargo)
);

// Modificar costBreakdown para incluir peajes exactos
costBreakdown.tollCost = tollData.tolls.totalCost;
costBreakdown.tollBreakdown = tollData.tolls.breakdown;
```

8. CACHE IMPLEMENTATION:
- Key: `tollguru_${origin}_${destination}_${vehicleHash}`
- TTL: 24 horas
- Storage: Redis o Map en memoria
- Invalidation: Automática si API falla

9. LOGGING DETALLADO:
- Requests TollGuru (input/output)
- Cache hits/misses
- Errores y fallbacks utilizados
- Performance metrics

VALIDACIÓN FINAL:
- ✅ Servicio TollGuru funcionando independientemente
- ✅ Integración con OpenRoute Service preservada
- ✅ CalculationEngine usando datos reales de peajes  
- ✅ Casos Madrid-París, Barcelona-Milán validados
- ✅ Error handling no rompe flujo cotización
- ✅ Performance < 3 segundos total
- ✅ Cache optimizando requests repetidos

ARCHIVOS A CREAR/MODIFICAR:
1. backend/src/services/tollGuruService.js (NUEVO)
2. backend/src/services/calculationEngine.js (MODIFICAR - integrar TollGuru)
3. backend/.env.example (ACTUALIZAR - variables TollGuru)
4. backend/src/config/apis.js (ACTUALIZAR - configuración TollGuru)

NO MODIFICAR:
- OpenRoute Service (ya funciona)
- LUC1 Service (ya funciona) 
- Frontend (mantener compatible)
- Flujo general cotización (solo mejorar con datos reales)

RESULTADO ESPERADO:
Sistema que combine ruta OpenRoute + peajes exactos TollGuru + análisis LUC1 para generar cotizaciones con 90%+ confianza en lugar del 80% actual.

¿Puedes implementar esta integración completa manteniendo compatibilidad total con el sistema existente?
```

---

## 📋 INFORMACIÓN COMPLEMENTARIA

### **Contexto Técnico TollGuru**

**Ventajas Competitivas:**
- ✅ **Map-agnostic**: Compatible con cualquier servicio de mapas (OpenRoute, Google, HERE)
- ✅ **Cobertura Europa**: 48 países con datos en tiempo real
- ✅ **Vehículos comerciales**: Soporte hasta 9 ejes con parámetros específicos
- ✅ **Pricing competitivo**: $80/mes vs $200+ competencia
- ✅ **Sin vendor lock-in**: Mantiene flexibilidad de routing

**Casos de Uso Stock Logistic:**
- **Productos forestales**: Camiones especializados con dimensiones/peso específico
- **Rutas europeas**: España-Francia-Italia-Alemania-Polonia principalmente  
- **Precisión peajes**: Eliminar markup 20-30% por incertidumbre
- **Cotizaciones inmediatas**: < 3 segundos respuesta total

### **Integración con Arquitectura Existente**

```
FLUJO ACTUAL:
QuoteForm → CalculationEngine → OpenRoute + LUC1 → QuoteResult

FLUJO MEJORADO:
QuoteForm → CalculationEngine → OpenRoute + TollGuru + LUC1 → QuoteResult
                                      ↓
                              Peajes exactos por país
                              Datos reales vs estimaciones
```

### **Métricas de Éxito**

**Antes (Estimaciones):**
- Confianza cotización: 75-80%
- Márgen error peajes: ±25%
- Tiempo respuesta: 2-3 segundos

**Después (TollGuru):**
- Confianza cotización: 88-92%
- Márgen error peajes: ±5%  
- Tiempo respuesta: 2-4 segundos
- Precisión: Datos reales autopistas europeas

---

## 🚀 PRÓXIMOS PASOS

1. **Implementar TollGuru Service** siguiendo especificaciones
2. **Integrar en Calculation Engine** manteniendo compatibilidad
3. **Validar casos obligatorios** Madrid-París, Barcelona-Milán, Valencia-Roma
4. **Optimizar performance** con cache y error handling
5. **Documentar integration** para future maintenance

**¿Listo para implementar la integración TollGuru y elevar la precisión de cotizaciones Stock Logistic al siguiente nivel?** 🛣️💰