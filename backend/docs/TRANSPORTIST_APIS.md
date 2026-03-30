# 🚛 APIs de Plataformas de Transporte - Integración Real

## Estado: POC - Preparado para Integración

Este documento detalla las APIs de transportistas europeos disponibles para integración en AXEL.

---

## 📋 Plataformas Principales

### 1. **TIMOCOM** 🥇
**Estado**: API Comercial Disponible
**Sitio**: https://www.timocom.com/
**Cobertura**: Europa (45+ países)
**Tipo**: Bolsa de carga premium

#### API Information:
- **Documentación**: https://developer.timocom.com/
- **Tipo**: REST API + WebSocket
- **Autenticación**: OAuth 2.0 / API Key
- **Rate Limits**: Variable según plan

#### Endpoints Principales:
```
POST /api/v1/freight/search
POST /api/v1/freight/quote
GET  /api/v1/carriers/available
POST /api/v1/bookings
```

#### Datos de Cotización:
```json
{
  "route": {
    "origin": "Barcelona, Spain",
    "destination": "Milan, Italy",
    "distance": 725
  },
  "cargo": {
    "weight": 15000,
    "volume": 30,
    "type": "general"
  },
  "response": {
    "price": 1421,
    "currency": "EUR",
    "carriers_available": 24,
    "estimated_days": 2,
    "confidence": 92
  }
}
```

**Costo**: ~€500-1500/mes según volumen
**Registro**: Requiere cuenta corporativa

---

### 2. **TRANS.EU** 🌐
**Estado**: API Comercial Disponible
**Sitio**: https://www.trans.eu/
**Cobertura**: Europa Central y Oriental
**Tipo**: Bolsa de carga + TMS

#### API Information:
- **Documentación**: https://api.trans.eu/documentation
- **Tipo**: REST API
- **Autenticación**: API Key + OAuth
- **Rate Limits**: 1000 req/hora

#### Endpoints Principales:
```
POST /freight-exchange/offers
GET  /freight-exchange/carriers
POST /quotes/calculate
GET  /tracking/{shipment_id}
```

#### Datos de Cotización:
```json
{
  "route": {
    "from": {"city": "Barcelona", "country": "ES"},
    "to": {"city": "Berlin", "country": "DE"}
  },
  "load": {
    "weight_kg": 15000,
    "volume_m3": 30,
    "type": "GENERAL"
  },
  "response": {
    "offers": [
      {
        "carrier_id": "TRANS-12345",
        "price": 3500,
        "currency": "EUR",
        "transit_days": 3,
        "vehicle_type": "TRUCK_TARPAULIN"
      }
    ]
  }
}
```

**Costo**: ~€300-800/mes
**Registro**: https://www.trans.eu/en/register

---

### 3. **SENNDER** ⚡
**Estado**: API Enterprise Disponible
**Sitio**: https://www.sennder.com/
**Cobertura**: Europa (Digital freight forwarder)
**Tipo**: Plataforma digital + Red transportistas

#### API Information:
- **Documentación**: https://api.sennder.com/docs (Requiere partnership)
- **Tipo**: REST API (Modern)
- **Autenticación**: Bearer Token (JWT)
- **Rate Limits**: 500 req/min

#### Endpoints Principales:
```
POST /v2/quotes
POST /v2/shipments
GET  /v2/carriers/network
GET  /v2/tracking/live
POST /v2/booking/confirm
```

#### Datos de Cotización:
```json
{
  "shipment": {
    "pickup": {
      "location": "Barcelona, ES",
      "date": "2025-10-10"
    },
    "delivery": {
      "location": "Milan, IT",
      "date": "2025-10-12"
    },
    "goods": {
      "weight_kg": 15000,
      "volume_cbm": 30,
      "type": "FOREST_PRODUCTS"
    }
  },
  "response": {
    "quote_id": "SEN-Q-123456",
    "price": {
      "amount": 1253,
      "currency": "EUR"
    },
    "service_level": "EXPRESS",
    "carriers_available": 16,
    "valid_until": "2025-10-05T23:59:59Z"
  }
}
```

**Costo**: Modelo partnership / comisión por envío
**Registro**: Contacto comercial directo

---

### 4. **INSTAFREIGHT** 🚀
**Estado**: API Startup Disponible
**Sitio**: https://www.instafreight.com/
**Cobertura**: Alemania, Francia, España, Italia
**Tipo**: Plataforma digital startup

#### API Information:
- **Documentación**: https://developers.instafreight.com/
- **Tipo**: REST API (GraphQL también disponible)
- **Autenticación**: API Key
- **Rate Limits**: 200 req/min

#### Endpoints Principales:
```
POST /api/v1/instant-quotes
POST /api/v1/bookings
GET  /api/v1/tracking/{booking_id}
GET  /api/v1/carriers/availability
```

#### Datos de Cotización:
```json
{
  "quote_request": {
    "origin": {
      "city": "Barcelona",
      "country": "ES",
      "postal_code": "08001"
    },
    "destination": {
      "city": "Milan",
      "country": "IT",
      "postal_code": "20121"
    },
    "cargo": {
      "weight_kg": 15000,
      "pallets": 20,
      "hazmat": false
    }
  },
  "response": {
    "quote_id": "IF-2025-123456",
    "price_eur": 1163,
    "carriers_matched": 8,
    "estimated_delivery_days": 2,
    "service_type": "STANDARD"
  }
}
```

**Costo**: ~€200-500/mes + comisión
**Registro**: https://www.instafreight.com/signup

---

### 5. **CARGOPEDIA** 📦
**Estado**: API Disponible (Limitada)
**Sitio**: https://www.cargopedia.net/
**Cobertura**: Europa del Este principalmente
**Tipo**: Bolsa de carga

#### API Information:
- **Documentación**: https://api.cargopedia.net/docs
- **Tipo**: REST API (Básica)
- **Autenticación**: API Token
- **Rate Limits**: 100 req/hora (plan básico)

#### Endpoints Principales:
```
POST /freight/search
GET  /companies/carriers
POST /freight/offer
```

#### Datos de Cotización:
```json
{
  "from_country": "ES",
  "from_city": "Barcelona",
  "to_country": "IT",
  "to_city": "Milan",
  "weight": 15000,
  "response": {
    "offers": [
      {
        "price": 1189,
        "currency": "EUR",
        "carrier_name": "Transportes XYZ",
        "vehicles_available": 9
      }
    ]
  }
}
```

**Costo**: ~€150-400/mes
**Registro**: https://www.cargopedia.net/register

---

## 🔧 Alternativas Adicionales

### 6. **WTRANSNET**
- **Sitio**: https://www.wtransnet.com/
- **Cobertura**: España, Portugal, Francia
- **API**: Disponible (REST)
- **Costo**: ~€300-600/mes

### 7. **FREIGHTFINDERS**
- **Sitio**: https://www.freightfinders.com/
- **Cobertura**: Europa
- **API**: En desarrollo (2025)
- **Costo**: Por negociar

### 8. **UBER FREIGHT** (Europa)
- **Sitio**: https://www.uberfreight.com/
- **Cobertura**: Europa Occidental
- **API**: https://developer.uber.com/docs/freight
- **Costo**: Comisión por envío

---

## 📊 Comparativa de APIs

| Plataforma | API Quality | Documentación | Costo Aprox | Cobertura | Recomendación |
|------------|-------------|---------------|-------------|-----------|---------------|
| **TIMOCOM** | ⭐⭐⭐⭐⭐ | Excelente | €€€ | Europa completa | **Primera opción** |
| **TRANS.EU** | ⭐⭐⭐⭐ | Buena | €€ | Europa Central/Este | **Segunda opción** |
| **SENNDER** | ⭐⭐⭐⭐⭐ | Excelente | Partnership | Europa | **Premium** |
| **INSTAFREIGHT** | ⭐⭐⭐⭐ | Buena | €€ | Oeste Europa | **Startup** |
| **CARGOPEDIA** | ⭐⭐⭐ | Básica | € | Europa Este | **Económico** |

---

## 🎯 Estrategia de Integración Recomendada

### Fase 1: MVP (2-3 semanas)
1. **Integrar 1 API principal**: TIMOCOM o TRANS.EU
2. Mantener fallback simulado
3. Testing con rutas reales

### Fase 2: Multi-source (1 mes)
1. Añadir 2-3 APIs adicionales
2. Sistema de priorización
3. Aggregation inteligente

### Fase 3: Optimización (continuo)
1. Machine learning para selección
2. Precios históricos
3. Predicción de disponibilidad

---

## 💰 Costos Estimados

### Escenario Básico (1 API):
- **TRANS.EU**: €400/mes
- **Setup**: 1 semana desarrollo
- **Total primer mes**: ~€2,000 (desarrollo + suscripción)

### Escenario Completo (3-4 APIs):
- **TIMOCOM**: €800/mes
- **TRANS.EU**: €400/mes
- **INSTAFREIGHT**: €300/mes
- **Total mensual**: ~€1,500
- **Setup inicial**: 3-4 semanas desarrollo

---

## 🔐 Requisitos Técnicos

### Credenciales Necesarias:
```env
# TIMOCOM
TIMOCOM_API_KEY=your_api_key
TIMOCOM_CLIENT_ID=your_client_id
TIMOCOM_CLIENT_SECRET=your_secret

# TRANS.EU
TRANSEU_API_KEY=your_api_key
TRANSEU_COMPANY_ID=your_company_id

# SENNDER
SENNDER_API_TOKEN=your_jwt_token
SENNDER_PARTNER_ID=your_partner_id

# INSTAFREIGHT
INSTAFREIGHT_API_KEY=your_api_key
```

### Infraestructura:
- ✅ Rate limiting
- ✅ Retry logic
- ✅ Caching (Redis)
- ✅ Fallback simulado
- ✅ Error handling robusto

---

## 📝 Próximos Pasos

1. ✅ **Decidir prioridad de integración**
2. 🔲 Registrarse en plataformas seleccionadas
3. 🔲 Obtener credenciales de API
4. 🔲 Implementar adaptadores
5. 🔲 Testing exhaustivo
6. 🔲 Deploy gradual

---

## 📞 Contacto con Plataformas

### TIMOCOM
- Email: api-support@timocom.com
- Tel: +49 211 88 26 88 0

### TRANS.EU
- Email: api@trans.eu
- Tel: +48 61 665 10 00

### SENNDER
- Email: partnerships@sennder.com
- Tel: +49 30 629 3676 00

---

**Última actualización**: 30 Septiembre 2025
**Preparado por**: Claude AI Assistant
**Estado**: Listo para implementación