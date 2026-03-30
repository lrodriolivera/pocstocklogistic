# 🚀 Guía de Integración de APIs de Transportistas

## Estado Actual

✅ **Sistema preparado para integración**
- Modo actual: **MOCK** (datos simulados)
- Adaptadores creados: Timocom, Trans.eu
- Arquitectura: Hybrid (APIs reales + fallback simulado)

---

## 🎯 Quick Start - Integrar Primera API

### Opción 1: TIMOCOM (Recomendado)

#### 1. Obtener Credenciales
```bash
# Contactar TIMOCOM
Email: api-support@timocom.com
Tel: +49 211 88 26 88 0
Sitio: https://www.timocom.com/en/contact

# Solicitar:
- API Key
- Client ID
- Client Secret
```

#### 2. Configurar Variables de Entorno
```bash
# Copiar archivo ejemplo
cp .env.transportist.example .env.transportist

# Editar y agregar credenciales
nano .env.transportist
```

```env
# Cambiar modo a hybrid
TRANSPORTIST_API_MODE=hybrid

# Agregar credenciales TIMOCOM
TIMOCOM_API_KEY=tu_api_key_real
TIMOCOM_CLIENT_ID=tu_client_id
TIMOCOM_CLIENT_SECRET=tu_client_secret
```

#### 3. Cargar Variables
```bash
# En el archivo principal .env
source .env.transportist

# O agregar al .env principal
cat .env.transportist >> .env
```

#### 4. Reiniciar Backend
```bash
cd backend
npm restart
```

#### 5. Verificar Integración
```bash
# Ver logs del backend
# Deberías ver:
# ✅ Timocom adapter ready
# 🚛 MultiTransportistService initialized in HYBRID mode
```

#### 6. Probar Cotización
Genera una cotización desde el frontend y verifica los logs:
```
📡 Timocom: Using REAL API
✅ Timocom: Real API quote - €1421
```

---

### Opción 2: TRANS.EU

#### 1. Registro
```bash
# Registrarse en Trans.eu
https://www.trans.eu/en/register

# Solicitar acceso API
Email: api@trans.eu
Tel: +48 61 665 10 00
```

#### 2. Configurar
```env
TRANSPORTIST_API_MODE=hybrid
TRANSEU_API_KEY=tu_api_key
TRANSEU_COMPANY_ID=tu_company_id
```

#### 3. Reiniciar y Probar
```bash
npm restart
```

---

## 📊 Modos de Operación

### MOCK Mode (Actual - POC)
```env
TRANSPORTIST_API_MODE=mock
```
- ✅ No requiere credenciales
- ✅ Respuestas instantáneas
- ✅ Ideal para desarrollo/testing
- ❌ Precios simulados (no reales)

### HYBRID Mode (Recomendado para Producción)
```env
TRANSPORTIST_API_MODE=hybrid
```
- ✅ Usa APIs reales cuando están disponibles
- ✅ Fallback automático a mock si API falla
- ✅ Máxima disponibilidad
- ⚠️ Requiere al menos 1 API configurada

### REAL Mode (Producción Completa)
```env
TRANSPORTIST_API_MODE=real
```
- ✅ Solo APIs reales
- ❌ Falla si API no disponible
- ⚠️ Requiere todas las APIs configuradas
- 💰 Máximo costo

---

## 🔧 Arquitectura del Sistema

```
AXEL Backend
    ↓
MasterQuoteService
    ↓
MultiTransportistService
    ├─ Mode: MOCK → simulateAPICall()
    ├─ Mode: REAL → adapter.getQuote()
    └─ Mode: HYBRID → Try real, fallback mock
          ↓
    [Adapters]
    ├─ TimocomAdapter
    ├─ TransEuAdapter
    ├─ SennderAdapter (TODO)
    ├─ InstaFreightAdapter (TODO)
    └─ CargopediaAdapter (TODO)
          ↓
    [APIs Reales]
    ├─ https://api.timocom.com/v1
    ├─ https://api.trans.eu
    └─ ...
```

---

## 📝 Checklist de Integración

### Fase 1: Preparación (Completado ✅)
- [x] Documentar APIs disponibles
- [x] Crear adaptadores base
- [x] Implementar Timocom adapter
- [x] Implementar Trans.eu adapter
- [x] Actualizar multiTransportistService
- [x] Configurar variables de entorno
- [x] Crear documentación

### Fase 2: Integración MVP (Siguiente)
- [ ] Obtener credenciales de 1 API prioritaria (Timocom o Trans.eu)
- [ ] Configurar credenciales en .env
- [ ] Cambiar modo a HYBRID
- [ ] Testing con rutas reales
- [ ] Verificar precios vs mock
- [ ] Monitorear errores 48 horas

### Fase 3: Expansión
- [ ] Obtener credenciales de 2-3 APIs adicionales
- [ ] Implementar adaptadores faltantes
- [ ] Testing multi-fuente
- [ ] Comparativa de precios entre fuentes
- [ ] Optimizar timeouts y retries

### Fase 4: Producción
- [ ] Todas las APIs configuradas
- [ ] Monitoreo y alertas
- [ ] Logs centralizados
- [ ] Métricas de performance
- [ ] Cambiar a modo REAL (opcional)

---

## 🐛 Troubleshooting

### Problema: "Timocom adapter not found"
```bash
# Solución:
cd backend
npm install  # Asegurar dependencias
node src/services/transportist-adapters/TimocomAdapter.js  # Test directo
```

### Problema: "API returns 401 Unauthorized"
```bash
# Verificar credenciales
echo $TIMOCOM_API_KEY  # Debe mostrar la key

# Renovar token si es necesario
# Contactar soporte del proveedor
```

### Problema: "Timeout en API real"
```env
# Aumentar timeout
TRANSPORTIST_API_TIMEOUT=60000  # 60 segundos
```

### Problema: "Precios muy diferentes a mock"
✅ **Esto es NORMAL y ESPERADO**
- Mock usa algoritmo simplificado
- APIs reales consideran:
  - Demanda actual del mercado
  - Disponibilidad de transportistas
  - Peajes y costos reales
  - Restricciones específicas

---

## 📈 Monitoreo

### Logs a Observar
```bash
# Modo de operación
🚛 MultiTransportistService initialized in HYBRID mode

# APIs disponibles
✅ Timocom adapter ready
✅ Trans.eu adapter ready

# Consultas exitosas
📡 Timocom: Using REAL API
✅ Timocom: Real API quote - €1421

# Fallbacks
⚠️ Timocom: Real API failed, using mock fallback
📋 Timocom: Using MOCK data
```

### Métricas Importantes
- **Success Rate**: % de APIs que responden exitosamente
- **Response Time**: Tiempo promedio de respuesta
- **Fallback Rate**: % de veces que se usa mock en modo hybrid
- **Cost per Query**: Costo por consulta (APIs de pago)

---

## 💰 Costos Estimados

### Escenario 1: MVP (1 API)
- **API**: Trans.eu
- **Costo mensual**: €400
- **Desarrollo**: 1 semana
- **Total primer mes**: ~€2,000

### Escenario 2: Estándar (2-3 APIs)
- **APIs**: Timocom + Trans.eu + InstaFreight
- **Costo mensual**: €1,500
- **Desarrollo**: 2-3 semanas
- **Total primer mes**: ~€5,000

### Escenario 3: Completo (4-5 APIs)
- **APIs**: Todas
- **Costo mensual**: €2,500
- **Desarrollo**: 4-6 semanas
- **Total primer mes**: ~€10,000

---

## 🎯 Recomendación

### Para POC (Actual)
```env
TRANSPORTIST_API_MODE=mock
```
✅ Sin costo
✅ Funcional completo
✅ Perfecto para demos

### Para MVP (Próximo paso)
```env
TRANSPORTIST_API_MODE=hybrid
# Configurar 1 API (Timocom recomendado)
```
✅ Precios reales
✅ Fallback seguro
✅ Costo controlado

### Para Producción
```env
TRANSPORTIST_API_MODE=hybrid
# Configurar 3-4 APIs
```
✅ Máxima confiabilidad
✅ Mejores precios
✅ Alta disponibilidad

---

## 📞 Soporte

### Contactos APIs
- **TIMOCOM**: api-support@timocom.com
- **TRANS.EU**: api@trans.eu
- **SENNDER**: partnerships@sennder.com
- **INSTAFREIGHT**: support@instafreight.com

### Documentación Adicional
- API Details: `backend/docs/TRANSPORTIST_APIS.md`
- Adapters Code: `backend/src/services/transportist-adapters/`
- Config Example: `backend/.env.transportist.example`

---

**Última actualización**: 30 Septiembre 2025
**Estado**: ✅ Listo para integración
**Próximo paso**: Obtener credenciales de 1 API prioritaria