# 🚀 Guía Completa de Despliegue en Render.com

Esta guía te ayudará a desplegar los 3 componentes del sistema (Backend, Frontend y Admin Panel) en Render.com de forma profesional.

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Preparación del Código](#preparación-del-código)
3. [Configuración de Render](#configuración-de-render)
4. [Deploy del Backend + PostgreSQL](#1-deploy-del-backend--postgresql)
5. [Deploy del Frontend](#2-deploy-del-frontend)
6. [Deploy del Admin Panel](#3-deploy-del-admin-panel)
7. [Verificación y Testing](#verificación-y-testing)
8. [Troubleshooting](#troubleshooting)
9. [Mantenimiento](#mantenimiento)

---

## Pre-requisitos

### ✅ Checklist Inicial

- [ ] Cuenta en [Render.com](https://render.com) (gratis)
- [ ] Cuenta en [GitHub](https://github.com) con el proyecto pusheado
- [ ] Git instalado localmente
- [ ] Acceso al repositorio desde Render (conectar GitHub)

### 💰 Costos Estimados en Render

| Servicio | Plan | Costo |
|----------|------|-------|
| PostgreSQL | Free (90 días) | $0 luego $7/mes |
| Backend API | Free (spin down después 15 min) | $0 o $7/mes |
| Frontend | Free | $0 |
| Admin Panel | Free | $0 |
| **Total** | **Free Tier** | **$0** o **$14-21/mes** (paid) |

**Nota sobre Free Tier:**
- ⏱️ Servicios gratuitos entran en "sleep" después de 15 minutos de inactividad
- 🐌 Primera petición después del sleep tarda ~30-60 segundos
- 💡 Recomendado para desarrollo/testing inicial
- 🚀 Para producción real, usar planes pagos ($7/mes por servicio)

---

## Preparación del Código

### 1. Verificar Estructura del Proyecto

Tu proyecto debe tener esta estructura en GitHub:

```
Sistema-de-comandas-Casa-Montis/
├── backend/          # API Node.js + Express
├── frontend/         # App Next.js de usuarios
├── admin-panel/      # Panel Next.js de administración
├── local-print-plugin/  # Plugin Python (NO se despliega)
└── GUIA DE USO/      # Documentación
```

### 2. Actualizar `.gitignore` en cada carpeta

**Verificar que estos archivos NO estén en Git:**

```gitignore
# backend/.gitignore
node_modules/
dist/
.env
*.log
storage/contratos/*
storage/nomina_pdfs/*

# frontend/.gitignore y admin-panel/.gitignore
node_modules/
.next/
.env.local
.env.production
out/
```

### 3. Verificar Scripts de Build

**Backend - `package.json`:**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "migrate": "ts-node src/scripts/migrate.ts"
  }
}
```

**Frontend y Admin-Panel - `package.json`:**
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  }
}
```

### 4. Push a GitHub

```bash
cd Sistema-de-comandas-Casa-Montis

# Si no has inicializado git
git init
git add .
git commit -m "Preparar para deploy en Render"

# Crear repositorio en GitHub y conectarlo
git remote add origin https://github.com/Juanshiu/Sistema-de-comandas-Casa-Montis.git
git branch -M main
git push -u origin main
```

---

## Configuración de Render

### Conectar GitHub a Render

1. Ve a [Render.com](https://render.com) y haz login
2. Click en tu avatar (arriba derecha) → **Account Settings**
3. Ve a **Connected Accounts** → **Connect GitHub**
4. Autoriza Render para acceder a tus repositorios
5. Selecciona el repo `Sistema-de-comandas-Casa-Montis`

---

## 1. Deploy del Backend + PostgreSQL

### Paso 1.1: Crear Base de Datos PostgreSQL

1. En Render Dashboard → **New +** → **PostgreSQL**
2. Configurar:
   - **Name**: `montis-cloud-db` (o el nombre que prefieras)
   - **Database**: `montis_cloud`
   - **User**: `montis_user` (automático)
   - **Region**: `Oregon (US West)` o el más cercano a ti
   - **Plan**: Free (para empezar)
3. Click **Create Database**
4. **⚠️ IMPORTANTE**: Copia la **Internal Database URL** que aparece:
   - Formato: `postgresql://user:password@host:5432/dbname`
   - La necesitarás en el siguiente paso

**🔒 Guardar Credenciales (NO compartir):**
```
Internal Database URL: postgresql://montis_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/montis_cloud
```

### Paso 1.2: Crear Web Service para Backend

1. En Render Dashboard → **New +** → **Web Service**
2. Conectar repositorio:
   - Busca `Sistema-de-comandas-Casa-Montis`
   - Click **Connect**
3. Configurar:
   - **Name**: `montis-cloud-backend`
   - **Region**: Misma que la base de datos
   - **Branch**: `main` (o `master`)
   - **Root Directory**: `backend` ⚠️ **MUY IMPORTANTE**
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (para empezar)

4. **Environment Variables** (click en "Advanced"):

```env
# Obligatorias
NODE_ENV=production
PORT=3001
DATABASE_URL=<PEGAR_AQUI_LA_INTERNAL_DATABASE_URL_DEL_PASO_1.1>
JWT_SECRET=<GENERAR_UNO_SEGURO_ABAJO>

# Opcional (si usas impresión)
ESC_POS_URL=http://localhost:8001/imprimir
```

**Generar JWT_SECRET seguro:**
```bash
# En tu terminal local (Windows):
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))

# O usa este ejemplo (CAMBIALO):
JWT_SECRET=nB7vK9mP2sQ8wE4xR6tY0uI1oA3zD5fG7hJ9kL2nM4pQ6sT8vX0yB1cE3fH5jK7m
```

5. Click **Create Web Service**

### Paso 1.3: Ejecutar Migraciones

Render ejecutará automáticamente el build, pero las migraciones debes hacerlas manualmente:

**Opción A: Desde Shell de Render (Recomendado)**

1. En tu servicio backend → pestaña **Shell** (arriba)
2. Ejecutar:
```bash
npm run migrate
```

**Opción B: Localmente (conectándote a la BD remota)**

1. En tu terminal local:
```bash
cd backend
cp .env .env.backup  # Respaldar .env local

# Editar .env temporalmente con DATABASE_URL de Render
# DATABASE_URL=postgresql://montis_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/montis_cloud

npm run migrate

# Restaurar .env local
mv .env.backup .env
```

### Paso 1.4: Verificar Backend

1. Render te dará una URL tipo: `https://montis-cloud-backend.onrender.com`
2. Probar endpoints:
   - Health: `https://montis-cloud-backend.onrender.com/health`
   - API Info: `https://montis-cloud-backend.onrender.com/api/sistema/info`

**✅ Si ves respuestas JSON, tu backend está funcionando!**

---

## 2. Deploy del Frontend

### Paso 2.1: Crear Web Service para Frontend

1. En Render Dashboard → **New +** → **Web Service**
2. Conectar el mismo repositorio: `Sistema-de-comandas-Casa-Montis`
3. Configurar:
   - **Name**: `montis-cloud-frontend`
   - **Region**: Misma que backend
   - **Branch**: `main`
   - **Root Directory**: `frontend` ⚠️ **MUY IMPORTANTE**
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables**:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://montis-cloud-backend.onrender.com/api
```

**⚠️ Reemplaza con TU URL del backend del Paso 1.4**

5. Click **Create Web Service**

### Paso 2.2: Verificar Frontend

Tu frontend estará en: `https://montis-cloud-frontend.onrender.com`

**Pruebas:**
- ✅ Debe cargar la página de login
- ✅ Debería poder hacer login (si creaste un usuario en la BD)
- ✅ Verificar en DevTools que hace peticiones a tu backend en Render

---

## 3. Deploy del Admin Panel

### Paso 3.1: Crear Web Service para Admin Panel

1. En Render Dashboard → **New +** → **Web Service**
2. Conectar el mismo repositorio: `Sistema-de-comandas-Casa-Montis`
3. Configurar:
   - **Name**: `montis-cloud-admin`
   - **Region**: Misma región
   - **Branch**: `main`
   - **Root Directory**: `admin-panel` ⚠️ **MUY IMPORTANTE**
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables**:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://montis-cloud-backend.onrender.com
```

**⚠️ Reemplaza con TU URL del backend (SIN /api al final)**

5. Click **Create Web Service**

### Paso 3.2: Verificar Admin Panel

Tu admin panel estará en: `https://montis-cloud-admin.onrender.com`

---

## Verificación y Testing

### ✅ Checklist de Verificación Final

**Backend:**
- [ ] `GET /health` responde con status 200
- [ ] `GET /api/sistema/info` responde con JSON
- [ ] Base de datos PostgreSQL conectada (revisa logs en Render)
- [ ] Migraciones ejecutadas correctamente
- [ ] No hay errores en los logs de Render

**Frontend:**
- [ ] Página principal carga sin errores
- [ ] Login funciona correctamente
- [ ] Peticiones a API se hacen a la URL correcta (DevTools → Network)
- [ ] No hay errores de CORS en consola
- [ ] Interfaz se ve correctamente (CSS cargado)

**Admin Panel:**
- [ ] Dashboard carga correctamente
- [ ] Login de admin funciona
- [ ] Puede ver lista de empresas
- [ ] No hay errores de red

### 🧪 Testing de Endpoints

```bash
# Backend Health
curl https://montis-cloud-backend.onrender.com/health

# Login Test
curl -X POST https://montis-cloud-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"tu_password"}'

# Obtener productos (con token)
curl https://montis-cloud-backend.onrender.com/api/productos \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

---

## Troubleshooting

### ❌ Error: "Application failed to respond"

**Causa:** El backend no está escuchando en el puerto correcto.

**Solución:**
1. Verificar en `backend/src/index.ts`:
```typescript
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```
2. Asegurar que el bind sea `0.0.0.0` (no `localhost`)

### ❌ Error: "CORS policy blocked"

**Causa:** Backend no está permitiendo peticiones desde los dominios de Render.

**Solución:** En `backend/src/index.ts`, configurar CORS:

```typescript
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://montis-cloud-frontend.onrender.com',
  'https://montis-cloud-admin.onrender.com',
  // Agrega tus dominios personalizados aquí
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Redeploy backend después de este cambio.**

### ❌ Error: "Database connection failed"

**Posibles causas:**

1. **DATABASE_URL incorrecta:**
   - Verifica en Render Dashboard → tu base de datos → Connection String
   - Usa **Internal Database URL** (no External)

2. **Base de datos no iniciada:**
   - En Render, el Free tier de PostgreSQL puede tardar en iniciar
   - Espera 1-2 minutos después de crear la BD

3. **Migraciones no ejecutadas:**
   - Ejecuta `npm run migrate` en el Shell de Render

### ❌ Frontend carga pero no hace peticiones

**Causa:** Variable `NEXT_PUBLIC_API_URL` mal configurada.

**Solución:**
1. Ve a tu servicio frontend en Render → **Environment**
2. Verifica que `NEXT_PUBLIC_API_URL` tenga la URL completa del backend
3. **Importante:** Debe incluir `https://` al inicio
4. Redeploy el frontend

### ❌ "Service Unavailable" después de 15 minutos

**Causa:** Free tier entra en sleep mode después de inactividad.

**Soluciones:**

**Opción A: Keep-alive gratuito con Cron Job**
- Usa [cron-job.org](https://cron-job.org) (gratis)
- Configura un ping cada 10 minutos a `https://tu-backend.onrender.com/health`

**Opción B: Upgrade a plan pago ($7/mes)**
- Plans pagos NO tienen sleep mode
- Recomendado para producción

### ❌ Build falla en Render

**Soluciones comunes:**

1. **Verificar Node version:**
```json
// package.json
{
  "engines": {
    "node": "18.x"
  }
}
```

2. **Verificar Root Directory:**
   - Backend: `backend`
   - Frontend: `frontend`
   - Admin: `admin-panel`

3. **Verificar Build Command:**
   - Debe ser: `npm install && npm run build`

4. **Logs detallados:**
   - Click en **Logs** en Render para ver errores específicos

---

## Mantenimiento

### 🔄 Actualizar el Código

```bash
# En tu máquina local
git add .
git commit -m "Descripción de cambios"
git push origin main

# Render detectará el push y hará auto-deploy automáticamente
```

### 📊 Monitoreo

**En Render Dashboard puedes ver:**
- **Logs** en tiempo real
- **Metrics** (CPU, memoria, requests)
- **Events** (deploys, crashes, restarts)

### 🗄️ Backups de Base de Datos

**Manual:**
1. Ve a tu base de datos en Render → **Shell**
2. Ejecuta:
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Automático:**
- Render hace backups automáticos diarios (plan pago)
- Free tier: NO tiene backups automáticos

### 💾 Backup Manual Recomendado (Free Tier)

```bash
# Desde tu terminal local con pg_dump instalado
pg_dump "postgresql://user:pass@host.render.com:5432/db" > backup_$(date +%Y%m%d).sql
```

### 🔐 Rotar JWT Secret

Si sospechas que tu JWT_SECRET fue comprometido:

1. Genera nuevo secret (comando del paso 1.2)
2. Actualiza en Render → Backend → Environment → JWT_SECRET
3. Click **Manual Deploy** → **Clear build cache & deploy**
4. ⚠️ Todos los usuarios deberán hacer login nuevamente

### 🎯 Dominios Personalizados

Para usar tu propio dominio (ej: `app.montiscloud.com`):

1. En Render → tu servicio → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Ingresa tu dominio: `app.montiscloud.com`
4. Render te dará registros DNS para configurar:
   - Tipo: `CNAME`
   - Name: `app`
   - Value: `montis-cloud-frontend.onrender.com`
5. Agrega estos registros en tu proveedor de dominios (GoDaddy, Namecheap, etc.)
6. Espera propagación DNS (5 min - 24 hrs)

**Render provee SSL/HTTPS automático con Let's Encrypt.**

---

## 📋 Resumen de URLs y Configuraciones

### URLs de Producción

```
Backend API:     https://montis-cloud-backend.onrender.com
Frontend App:    https://montis-cloud-frontend.onrender.com
Admin Panel:     https://montis-cloud-admin.onrender.com
Base de Datos:   dpg-xxxxx.oregon-postgres.render.com:5432
```

### Variables de Entorno por Servicio

**Backend:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host.render.com:5432/db
JWT_SECRET=tu_secret_muy_largo_y_aleatorio_aqui
```

**Frontend:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://montis-cloud-backend.onrender.com/api
```

**Admin Panel:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://montis-cloud-backend.onrender.com
```

---

## 🎉 ¡Deploy Exitoso!

Si llegaste hasta aquí y todo funciona, ¡felicidades! Tu sistema está en producción.

**Próximos pasos recomendados:**

1. ✅ Configurar monitoreo con [UptimeRobot](https://uptimerobot.com) (gratis)
2. ✅ Configurar backups automáticos de base de datos
3. ✅ Agregar dominio personalizado
4. ✅ Considerar upgrade a plan pago para mejor performance
5. ✅ Implementar logging centralizado (Sentry, LogRocket)
6. ✅ Configurar analytics (Google Analytics, Mixpanel)

**Soporte:**
- [Documentación de Render](https://render.com/docs)
- [Community Forum](https://community.render.com)
- [Status Page](https://status.render.com)

---

**📎 Documentado por:** Sistema de Comandas Montis Cloud  
**📅 Última actualización:** Febrero 2026  
**🔗 Repositorio:** [GitHub](https://github.com/Juanshiu/Sistema-de-comandas-Casa-Montis)
