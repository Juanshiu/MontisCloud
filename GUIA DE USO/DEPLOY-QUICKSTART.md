# 🚀 Inicio Rápido - Deploy en Render.com

Si ya leíste [`DEPLOY.md`](./DEPLOY.md) y [`CHECKLIST-DEPLOY.md`](./CHECKLIST-DEPLOY.md), aquí está la versión TL;DR:

## 1️⃣ Preparación (5 minutos)

```bash
# 1. Push a GitHub
git add .
git commit -m "Preparar para deploy"
git push origin main

# 2. Generar JWT Secret seguro
# Windows PowerShell:
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
# Guarda el resultado
```

## 2️⃣ Crear Servicios en Render (15 minutos)

### A. Base de Datos PostgreSQL
- New + → PostgreSQL
- Name: `montis-cloud-db`
- Plan: Free
- **Copiar Internal Database URL**

### B. Backend API
- New + → Web Service
- Repo: `Sistema-de-comandas-Casa-Montis`
- Root Directory: `backend`
- Build: `npm install && npm run build`
- Start: `npm start`

**Variables:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=<PEGAR_INTERNAL_URL_DE_ARRIBA>
JWT_SECRET=<PEGAR_EL_SECRET_GENERADO>
```

### C. Frontend
- New + → Web Service
- Root Directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npm start`

**Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://TU-BACKEND.onrender.com/api
```

### D. Admin Panel
- New + → Web Service
- Root Directory: `admin-panel`
- Build: `npm install && npm run build`
- Start: `npm start`

**Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://TU-BACKEND.onrender.com
```

## 3️⃣ Post-Deploy (5 minutos)

### Ejecutar Migraciones

En Render → Backend → Shell:
```bash
npm run migrate
```

### Actualizar CORS

En `backend/src/index.ts`, línea ~48:
```typescript
const allowedOrigins = [
  // ... localhost existentes ...
  'https://TU-FRONTEND.onrender.com',  // ← Agregar tu URL
  'https://TU-ADMIN.onrender.com',     // ← Agregar tu URL
];
```

Commit y push para redeploy automático.

## 4️⃣ Verificar (2 minutos)

```bash
# Health check
curl https://TU-BACKEND.onrender.com/health

# Login test en frontend
# Abrir: https://TU-FRONTEND.onrender.com
```

## 🎉 ¡Listo!

**URLs Finales:**
- Backend: `https://montis-cloud-backend.onrender.com`
- Frontend: `https://montis-cloud-frontend.onrender.com`
- Admin: `https://montis-cloud-admin.onrender.com`

---

**⏱️ Tiempo total:** ~30 minutos  
**💰 Costo:** $0 (Free tier con sleep mode)

**Problemas?** Ver [`DEPLOY.md`](./DEPLOY.md) sección Troubleshooting.
