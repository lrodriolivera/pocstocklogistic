# Guía de Despliegue en Render.com

## Resumen de Costos (Plan Starter)

| Servicio | Tipo | Costo/mes |
|----------|------|-----------|
| Backend (Node.js) | Web Service | $7 |
| AI-Service (Python) | Web Service | $7 |
| Frontend (React) | Static Site | **Gratis** |
| **Total** | | **~$14/mes** |

> **Nota**: MongoDB Atlas es externo y gratuito hasta 512MB.

---

## Paso 1: Configurar MongoDB Atlas (Gratis)

### 1.1 Crear cuenta en MongoDB Atlas

1. Ve a https://www.mongodb.com/cloud/atlas
2. Clic en **"Try Free"**
3. Regístrate con email o Google

### 1.2 Crear un Cluster Gratuito

1. Después de registrarte, clic en **"Build a Database"**
2. Selecciona **"M0 FREE"** (Shared)
3. Proveedor: **AWS** (recomendado)
4. Región: **eu-west-1 (Ireland)** o **eu-central-1 (Frankfurt)** - más cercano a España
5. Nombre del Cluster: `stock-logistic` (o el que prefieras)
6. Clic en **"Create Cluster"** (tarda 1-3 minutos)

### 1.3 Configurar Acceso

**Crear Usuario de Base de Datos:**
1. En el menú izquierdo: **"Database Access"**
2. Clic **"Add New Database User"**
3. Authentication: **Password**
4. Username: `stocklogistic`
5. Password: Genera una segura (guárdala!)
6. Role: **"Read and Write to any database"**
7. Clic **"Add User"**

**Configurar Network Access:**
1. En el menú izquierdo: **"Network Access"**
2. Clic **"Add IP Address"**
3. Clic **"Allow Access from Anywhere"** (0.0.0.0/0) - necesario para Render
4. Clic **"Confirm"**

### 1.4 Obtener Connection String

1. Ve a **"Database"** > **"Connect"**
2. Selecciona **"Drivers"**
3. Copia el connection string, se ve así:
```
mongodb+srv://stocklogistic:<password>@stock-logistic.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
4. Reemplaza `<password>` con tu contraseña real
5. Agrega el nombre de la base de datos antes del `?`:
```
mongodb+srv://stocklogistic:TU_PASSWORD@stock-logistic.xxxxx.mongodb.net/stock-logistic?retryWrites=true&w=majority
```

---

## Paso 2: Subir Código a GitHub

### 2.1 Crear Repositorio

```bash
# En la carpeta del proyecto
cd /home/rypcloud/Documentos/Logistic/POC/stock-logistic-poc

# Inicializar Git (si no está)
git init

# Crear .gitignore si no existe
cat >> .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
__pycache__/

# Environment files
.env
.env.local
*.env

# Build outputs
frontend/build/
dist/

# Logs
*.log
logs/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Cache
.cache/
*.pyc
EOF

# Agregar archivos
git add .
git commit -m "Initial commit - Stock Logistic POC ready for Render"

# Conectar a GitHub (crea el repo primero en github.com)
git remote add origin https://github.com/TU_USUARIO/stock-logistic-poc.git
git branch -M main
git push -u origin main
```

---

## Paso 3: Desplegar en Render

### Opción A: Despliegue Automático con Blueprint (Recomendado)

1. Ve a https://render.com y entra con tu cuenta
2. Clic en **"New"** > **"Blueprint"**
3. Conecta tu repositorio de GitHub
4. Render detectará el archivo `render.yaml` automáticamente
5. Revisa los servicios que se crearán
6. Clic **"Apply"**

### Opción B: Despliegue Manual (Servicio por Servicio)

#### Backend (Node.js)

1. Render Dashboard > **"New"** > **"Web Service"**
2. Conecta tu repo de GitHub
3. Configuración:
   - **Name**: `stock-logistic-backend`
   - **Region**: Frankfurt (EU Central)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month)
4. Clic **"Create Web Service"**

#### AI-Service (Python)

1. Render Dashboard > **"New"** > **"Web Service"**
2. Conecta tu repo de GitHub
3. Configuración:
   - **Name**: `stock-logistic-ai`
   - **Region**: Frankfurt (EU Central)
   - **Branch**: main
   - **Root Directory**: `ai-service`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python luci_server.py`
   - **Plan**: Starter ($7/month)
4. Clic **"Create Web Service"**

#### Frontend (React - Static Site)

1. Render Dashboard > **"New"** > **"Static Site"**
2. Conecta tu repo de GitHub
3. Configuración:
   - **Name**: `stock-logistic-frontend`
   - **Branch**: main
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
4. Clic **"Create Static Site"**

---

## Paso 4: Configurar Variables de Entorno

### Backend (stock-logistic-backend)

En Render, ve al servicio > **"Environment"** > **"Add Environment Variable"**:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://luisrodriguez_db_user:P5ivs1fUI9QlJ1HL@cluster0.vjappik.mongodb.net/stock-logistic?retryWrites=true&w=majority&appName=Cluster0` |
| `AI_SERVICE_URL` | `https://stock-logistic-ai.onrender.com` |
| `FRONTEND_URL` | `https://stock-logistic-frontend.onrender.com` |
| `OPENROUTE_API_KEY` | (tu key de OpenRouteService) |
| `TOLLGURU_API_KEY` | (tu key de TollGuru) |
| `JWT_SECRET` | (genera uno aleatorio) |
| `BCRYPT_ROUNDS` | `12` |

### AI-Service (stock-logistic-ai)

| Variable | Valor |
|----------|-------|
| `PORT` | `10000` |
| `HOST` | `0.0.0.0` |
| `CLAUDE_API_KEY` | `sk-ant-api03-...` (tu key de Anthropic) |
| `BACKEND_URL` | `https://stock-logistic-backend.onrender.com` |
| `CORS_ORIGINS` | `https://stock-logistic-frontend.onrender.com,https://stock-logistic-backend.onrender.com` |

### Frontend (stock-logistic-frontend)

| Variable | Valor |
|----------|-------|
| `REACT_APP_API_URL` | `https://stock-logistic-backend.onrender.com` |

---

## Paso 5: Verificar Despliegue

### Health Checks

Una vez desplegado, verifica que todo funcione:

```bash
# Backend
curl https://stock-logistic-backend.onrender.com/health

# AI Service
curl https://stock-logistic-ai.onrender.com/health

# Frontend
# Abre en navegador: https://stock-logistic-frontend.onrender.com
```

### Logs

Para debug, ve a cada servicio en Render y revisa la pestaña **"Logs"**.

---

## URLs Finales (ejemplo)

Después del despliegue tendrás URLs como:

- **Frontend**: https://stock-logistic-frontend.onrender.com
- **Backend API**: https://stock-logistic-backend.onrender.com
- **AI Service**: https://stock-logistic-ai.onrender.com

> **Nota**: Los nombres exactos dependen de la disponibilidad. Render agregará sufijos si el nombre ya está en uso.

---

## Troubleshooting

### Error: "Connection refused" en MongoDB

- Verifica que la IP `0.0.0.0/0` esté permitida en MongoDB Atlas Network Access
- Verifica que el usuario y contraseña sean correctos
- Asegúrate de que el nombre de la base de datos esté en el connection string

### Error: CORS

- Verifica que `FRONTEND_URL` en el backend tenga la URL exacta del frontend (con https://)
- Verifica que `CORS_ORIGINS` en ai-service incluya ambas URLs

### Frontend no carga datos

- Verifica que `REACT_APP_API_URL` esté configurado **antes** del build
- Si cambias la variable, necesitas hacer un nuevo deploy para que React la incluya en el build

### AI Service no responde

- Verifica que `CLAUDE_API_KEY` sea válida
- Revisa los logs en Render para ver el error específico

---

## Comandos Útiles para Desarrollo Local

```bash
# Variables de entorno para desarrollo local apuntando a producción
export REACT_APP_API_URL=https://stock-logistic-backend.onrender.com
npm start
```

---

## Seguridad

**IMPORTANTE - NO subir a Git:**
- `.env` con claves de API
- `CLAUDE_API_KEY`
- Connection strings con passwords

El archivo `.gitignore` ya excluye estos archivos.

---

## Mantenimiento

### Actualizar la aplicación

```bash
git add .
git commit -m "Update: descripción del cambio"
git push origin main
```

Render detectará el push y desplegará automáticamente.

### Monitoreo

- Render proporciona métricas básicas de CPU/memoria
- MongoDB Atlas tiene métricas de la base de datos
- Considera agregar logging externo (Papertrail, Logtail) para producción real

---

**Documentación creada**: Noviembre 2025
**Última actualización**: Noviembre 2025
