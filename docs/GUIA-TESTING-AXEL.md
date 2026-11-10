# GUIA DE TESTING - AXEL
## Sistema de Cotizaciones Inteligente de Transporte Europeo
### Tester: Clay | Marzo 2026

---

## CREDENCIALES DE ACCESO

| Campo | Valor |
|-------|-------|
| **URL** | https://axel.strixai.ai |
| **Email** | clay@strixai.ai |
| **Password** | ClayTester2026 |
| **Rol** | Supervisor |

---

## INDICE DE PRUEBAS

1. Acceso y Autenticacion
2. Dashboard Principal
3. Generar Cotizacion
4. Historial de Cotizaciones
5. Gestion de Clientes
6. Bolsas de Carga (Freight Exchange)
7. Chat con IA
8. Gestion de Usuarios
9. Portal de Cliente
10. Notificaciones en Tiempo Real
11. Casos Edge y Errores
12. Checklist de Reporte

---

## 1. ACCESO Y AUTENTICACION

### 1.1 Login
1. Ir a **https://axel.strixai.ai**
2. Veras la **Landing Page** publica con informacion del producto
3. Haz clic en **"Iniciar Sesion"** o ve directo a https://axel.strixai.ai/login
4. Introduce tus credenciales:
   - Email: `clay@strixai.ai`
   - Password: `ClayTester2026`
5. Click en **"Iniciar Sesion"**

**Resultado esperado**: Redireccion al Dashboard principal. Tu nombre "Clay Tester" aparece en la esquina superior derecha.

**Pruebas adicionales**:
- [ ] Intentar login con password incorrecto → Debe mostrar error
- [ ] Intentar login con email inexistente → Debe mostrar error
- [ ] Verificar que el token expira correctamente (7 dias)

### 1.2 Registro publico
1. Ir a https://axel.strixai.ai/register
2. Completar formulario con datos ficticios
3. **NO usar emails reales** - usa formato `test-XXX@strixai.ai`

**Resultado esperado**: Nuevo usuario creado con rol `agente_comercial` por defecto.

### 1.3 Recuperar contrasena
1. En la pantalla de login, clic en **"¿Olvidaste tu contrasena?"**
2. Introducir email
3. Verificar que el flujo funciona (puede requerir SES configurado)

---

## 2. DASHBOARD PRINCIPAL

Despues del login, veras el Dashboard con:

### Elementos a verificar:
- [ ] **Grafico de barras mensual** - Cotizaciones por mes (ultimos 6 meses)
- [ ] **Grafico circular (pie)** - Distribucion por estado (accepted, sent, rejected, etc.)
- [ ] **Actividad reciente** - Lista de ultimas 10 cotizaciones
- [ ] **Top agentes** - Ranking por revenue de cotizaciones aceptadas
- [ ] **Estadisticas generales** - Total cotizaciones, clientes, revenue

**Pruebas**:
- [ ] Los graficos se renderizan correctamente
- [ ] Los datos corresponden a los datos demo (25 clientes, 60 cotizaciones)
- [ ] La navegacion lateral (sidebar) funciona correctamente
- [ ] El boton de notificaciones muestra el centro de notificaciones

---

## 3. GENERAR COTIZACION

Esta es la **funcionalidad principal** de AXEL. Accede desde el sidebar: **"Nueva Cotizacion"**

### 3.1 Formulario de cotizacion

| Campo | Ejemplo para probar |
|-------|-------------------|
| **Origen** | Madrid, ES |
| **Destino** | Paris, FR |
| **Tipo de carga** | General |
| **Peso (kg)** | 15000 |
| **Fecha recogida** | Manana |
| **Tipo servicio** | Estandar |

### 3.2 Flujo paso a paso
1. Rellena el formulario con los datos de arriba
2. Click **"Generar Cotizacion"**
3. Espera la generacion (puede tardar 5-15 segundos)
4. Verifica la pantalla de resultados

### 3.3 Verificar resultados

**Resultado esperado**:
- [ ] **3 niveles de precio** (Economy, Standard, Premium)
- [ ] **Desglose de costos**: combustible, peajes, conductor, seguros, margen
- [ ] **Ruta calculada**: distancia en km, tiempo estimado, paises de transito
- [ ] **Restricciones europeas**: alertas de trafico, festivos, ADR si aplica
- [ ] **Boton PDF**: Descargar cotizacion en PDF
- [ ] **Validez**: Fecha de expiracion de la cotizacion

### 3.4 Calculadora de metros lineales
- En el formulario, hay una seccion **"Calculadora de Carga"**
- [ ] Verificar que calcula metros lineales correctamente
- [ ] Probar con diferentes tipos de pallets (europeo 120x80, industrial 120x100)

### 3.5 Pruebas de rutas variadas

| Ruta | Particularidad |
|------|---------------|
| Madrid → Paris | Internacional estandar |
| Barcelona → Munich | 3 paises (ES, FR, DE) |
| Valencia → Amsterdam | 4 paises con Benelux |
| Bilbao → London | Incluye ferry/tunel |
| Madrid → Lisbon | Corta distancia, Portugal |
| Sevilla → Naples | Ruta larga, 3 paises |
| Zaragoza → Stuttgart | Via Francia |
| Barcelona → Milan | Via costa |

**Para cada ruta verificar**:
- [ ] Se genera sin errores
- [ ] Los precios son razonables (0.80-2.50 EUR/km aprox)
- [ ] Los paises de transito son correctos
- [ ] El tiempo estimado es coherente con la distancia

### 3.6 Tipos de carga especiales
- [ ] **ADR (mercancias peligrosas)**: Debe mostrar alertas de restricciones ADR
- [ ] **Refrigerado**: Debe incluir suplemento de temperatura
- [ ] **Forestales**: Carga especial con dimensiones
- [ ] **LTL (carga parcial)**: Precio inferior a FTL
- [ ] **FTL (carga completa)**: Precio estandar

---

## 4. HISTORIAL DE COTIZACIONES

Accede desde sidebar: **"Historial"**

### Verificar:
- [ ] **Lista de cotizaciones** con paginacion
- [ ] **Filtros**: por estado, por fecha, por cliente, por agente
- [ ] **Buscador**: buscar por ID de cotizacion, empresa, ruta
- [ ] **Estados visibles**: active, sent, accepted, rejected, expired, negotiating, draft
- [ ] **Detalle**: click en una cotizacion abre su detalle completo
- [ ] **Export CSV**: boton de exportar a CSV funciona
- [ ] **Acciones**: cambiar estado, enviar al cliente, generar portal

---

## 5. GESTION DE CLIENTES

Accede desde sidebar: **"Clientes"**

### 5.1 Lista de clientes
- [ ] Se muestran los 25 clientes demo (21 ES + 4 EU)
- [ ] Buscador funciona (buscar por nombre, empresa, NIF)
- [ ] Stats: total clientes, activos, revenue total

### 5.2 Crear cliente
1. Click **"Nuevo Cliente"**
2. Rellenar formulario:
   - Nombre: `Test Client Clay`
   - Empresa: `Clay Testing SL`
   - Email: `test@claytesting.es`
   - NIF: `B99999999`
   - Ciudad: `Madrid`
3. Guardar

**Resultado esperado**: Cliente creado y visible en la lista.

### 5.3 Editar cliente
- [ ] Click en un cliente existente → se abre modal de edicion
- [ ] Modificar un campo → guardar → verificar que se actualizo

### 5.4 Desactivar cliente
- [ ] Desactivar un cliente → no aparece en la lista (soft delete)

---

## 6. BOLSAS DE CARGA (FREIGHT EXCHANGE)

Accede desde sidebar: **"Bolsas de Carga"**

### 6.1 Buscar ofertas
1. Seleccionar plataformas (o "Todas")
2. Pais origen: ES, Ciudad: Madrid
3. Pais destino: FR, Ciudad: Paris
4. Click **"Buscar"**

**Resultado esperado**:
- [ ] Se muestran ofertas de las 5 plataformas
- [ ] Cada oferta tiene badge con nombre de plataforma y color
- [ ] Precio, ruta, fecha, tipo de vehiculo visible
- [ ] Ordenadas por precio/km (mejor valor primero)

### 6.2 Plataformas
Las 5 plataformas integradas:

| Plataforma | Cobertura | Estado API |
|-----------|-----------|------------|
| **Timocom** | Europa completa | Live (credenciales configuradas) |
| **Wtransnet** | Sur de Europa | Mock (demo) |
| **Teleroute** | Europa Occidental | Mock (demo) |
| **Trans.eu** | Europa Central/Este | Mock (demo) |
| **Cargopedia** | Europa Este/Sur + Turquia | Mock (demo) |

- [ ] Verificar que Timocom muestra datos reales
- [ ] Las otras 4 muestran datos mock pero el formato es correcto

### 6.3 Buscar vehiculos
- [ ] Seccion "Vehiculos Disponibles" funciona
- [ ] Filtrar por tipo de vehiculo

### 6.4 Publicar oferta
- [ ] Probar publicar una oferta de carga
- [ ] Verificar que se puede seleccionar en que plataformas publicar

---

## 7. CHAT CON IA

Accede desde sidebar: **"Chat IA"**

### 7.1 Conversacion basica
Enviar estos mensajes y verificar respuestas coherentes:

1. `"Hola, que puedes hacer?"`
2. `"Necesito enviar 10 toneladas de Madrid a Berlin, que me recomiendas?"`
3. `"Cuales son las restricciones para mercancias ADR en Francia?"`
4. `"Cuanto cuesta aprox un transporte refrigerado Barcelona-Amsterdam?"`

**Verificar**:
- [ ] Las respuestas son relevantes al transporte y logistica
- [ ] No tarda mas de 60 segundos en responder
- [ ] El formato de la respuesta es legible (markdown renderizado)
- [ ] El sanitizado XSS funciona (probar enviar `<script>alert(1)</script>`)

### 7.2 Modelo dual
- Preguntas simples deben usar Haiku (rapido, <5s)
- Preguntas complejas deben usar Sonnet (mas lento pero detallado)
- [ ] Verificar que ambos tipos de respuesta funcionan

---

## 8. GESTION DE USUARIOS

Accede desde sidebar: **"Usuarios"** (disponible para tu rol de Supervisor)

### 8.1 Lista de usuarios
- [ ] Se muestran los usuarios del sistema (7 demo + tu cuenta)
- [ ] Cada usuario tiene badge de rol (color por rol)
- [ ] Tu rol (supervisor) te permite ver tus agentes gestionados

### 8.2 Editar usuario
- [ ] Como supervisor, puedes editar: nombre, apellido, telefono, departamento, activar/desactivar
- [ ] NO puedes cambiar roles (solo alta_gerencia puede)

### 8.3 Estadisticas por usuario
- [ ] Click en un usuario → ver sus estadisticas de cotizaciones

---

## 9. PORTAL DE CLIENTE

El portal permite a los clientes ver y responder cotizaciones sin login.

### 9.1 Generar acceso al portal
1. Ir al historial, seleccionar una cotizacion
2. Click **"Generar Acceso Portal"**
3. Se genera un link con token unico

### 9.2 Probar el portal
1. Abrir el link generado en **ventana de incognito**
2. Verificar:
   - [ ] La cotizacion se muestra completa (sin necesidad de login)
   - [ ] Boton **"Aceptar"** funciona
   - [ ] Boton **"Rechazar"** funciona
   - [ ] Boton **"Negociar"** abre formulario de contraoferta
   - [ ] El historial de negociacion se muestra correctamente

---

## 10. NOTIFICACIONES EN TIEMPO REAL

### 10.1 Centro de notificaciones
- [ ] Icono de campana en la barra superior
- [ ] Click abre panel de notificaciones
- [ ] Las notificaciones aparecen en tiempo real (via WebSocket)

### 10.2 Generar una notificacion
1. Genera una cotizacion nueva
2. Verifica que aparece notificacion "Cotizacion generada"

---

## 11. CASOS EDGE Y ERRORES

### 11.1 Validaciones de formulario
- [ ] Cotizacion sin origen → error de validacion
- [ ] Cotizacion con peso negativo → error
- [ ] Cliente sin nombre → no permite guardar
- [ ] Email invalido en cliente → validacion

### 11.2 Rendimiento
- [ ] La app carga en menos de 3 segundos
- [ ] La generacion de cotizacion tarda max 15 segundos
- [ ] El chat responde en max 60 segundos

### 11.3 Responsividad
- [ ] Probar en movil (o redimensionar navegador a 375px ancho)
- [ ] El sidebar se colapsa en movil
- [ ] Los formularios son usables en pantalla pequena

### 11.4 Seguridad basica
- [ ] No se puede acceder a /dashboard sin login (redirige a /login)
- [ ] No se puede acceder a /users siendo agente_comercial
- [ ] Los tokens expiran correctamente
- [ ] XSS en chat esta sanitizado (probar `<img onerror=alert(1) src=x>`)

---

## 12. CHECKLIST DE REPORTE

Al finalizar las pruebas, por favor reportar:

### Formato del reporte
Para cada bug encontrado, incluir:
1. **Seccion** (ej: "3. Generar Cotizacion")
2. **Paso para reproducir** (detallado)
3. **Resultado esperado** vs **Resultado obtenido**
4. **Severidad**: Critico / Alto / Medio / Bajo
5. **Screenshot** si es posible

### Resumen del testing
- [ ] Total de pruebas ejecutadas: ___
- [ ] Pruebas OK: ___
- [ ] Bugs encontrados: ___
- [ ] Bugs criticos: ___
- [ ] Bugs altos: ___
- [ ] Observaciones generales: ___

### Enviar reporte a
- luis.rodriguez@strixai.ai
- jenifer.romero@strixai.ai
- rodrigo.godoy@strixai.ai

---

## DATOS DEMO EN LA PLATAFORMA

La plataforma tiene datos precargados para testing:

| Dato | Cantidad |
|------|----------|
| Clientes | 25 (21 ES + 4 EU) |
| Cotizaciones | 60 (varios estados) |
| Rutas europeas | 25 |
| Usuarios | 8 (incluyendo tu cuenta) |
| Revenue demo | ~80.794 EUR |

### Usuarios disponibles (para probar diferentes roles)

| Email | Rol | Puede hacer |
|-------|-----|-------------|
| clay@strixai.ai | Supervisor | Todo excepto cambiar roles |
| luis@axel.es | Alta Gerencia | Todo (admin completo) |
| maria.torres@axel.es | Agente Comercial | Solo sus propias cotizaciones y clientes |

### API Endpoints disponibles (para testing avanzado)

```
POST   /api/auth/login                    - Login
GET    /api/quotes/generate               - Generar cotizacion
GET    /api/quotes/history/all            - Historial
GET    /api/quotes/statistics/charts       - Datos graficos
GET    /api/clients                        - Lista clientes
GET    /api/clients/stats                  - Stats clientes
GET    /api/freight-exchange/search        - Buscar cargas
GET    /api/freight-exchange/connection-status - Estado APIs
POST   /api/chat/message                   - Chat IA
GET    /api/users                          - Lista usuarios
GET    /api/tracking/status                - Estado tracking
GET    /api/billing/plans                  - Planes de precio
GET    /health                             - Health check
```

---

*Documento preparado por STRIX AI SL | Marzo 2026*
*Plataforma: AXEL v1.0.0 | https://axel.strixai.ai*
