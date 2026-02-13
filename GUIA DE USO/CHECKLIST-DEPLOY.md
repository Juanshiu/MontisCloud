# ✅ Checklist Pre-Deploy para Render.com

Usa esta lista de verificación antes de hacer deploy para evitar problemas comunes.

## 📋 Preparación General

### Código

- [ ] Todo el código está commiteado en Git
- [ ] Push hecho a GitHub en la branch `main` o `master`
- [ ] No hay archivos `.env` en el repositorio (verificar `.gitignore`)
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Node version especificada en `package.json`:
  ```json
  {
    "engines": {
      "node": "18.x"
    }
  }
  ```

### Scripts de Build

**Backend:**
- [ ] `npm run build` compila correctamente (ejecutar localmente)
- [ ] `npm start` ejecuta `node dist/index.js`
- [ ] `npm run migrate` funciona correctamente
- [ ] TypeScript compila sin errores (`tsc --noEmit`)

**Frontend:**
- [ ] `npm run build` funciona sin errores
- [ ] No hay errores de TypeScript
- [ ] `npm start` sirve el build de producción

**Admin Panel:**
- [ ] `npm run build` funciona sin errores
- [ ] No hay errores de TypeScript
- [ ] `npm start` sirve el build de producción

---

## 🔧 Backend

### Configuración

- [ ] `PORT` se lee de `process.env.PORT`
- [ ] Server hace bind a `0.0.0.0` (no `localhost`):
  ```typescript
  app.listen(PORT, '0.0.0.0', () => { ... });
  ```
- [ ] CORS configurado para permitir dominios de Render
- [ ] Variables de entorno definidas en `.env.example`

### Variables de Entorno Requeridas

```env
✅ NODE_ENV=production
✅ PORT=3001
✅ DATABASE_URL=postgresql://...
✅ JWT_SECRET=...
```

### Base de Datos

- [ ] Migraciones disponibles en `src/database/migrations/`
- [ ] Script `npm run migrate` funciona localmente
- [ ] Queries usan prepared statements (prevención SQL injection)

---

## 🎨 Frontend

### Configuración

- [ ] API URL se lee de `NEXT_PUBLIC_API_URL`
- [ ] No hay URLs hardcodeadas a `localhost`
- [ ] Build de Next.js funciona sin warnings críticos

### Variables de Entorno Requeridas

```env
✅ NODE_ENV=production
✅ NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com/api
```

### Assets

- [ ] Imágenes optimizadas (< 500KB cada una)
- [ ] Favicon presente en `public/`
- [ ] No hay imports de archivos fuera de `src/`

---

## 👥 Admin Panel

### Configuración

- [ ] API URL se lee de `NEXT_PUBLIC_API_URL`
- [ ] `next.config.js` configurado con rewrites dinámicos
- [ ] No hay URLs hardcodeadas

### Variables de Entorno Requeridas

```env
✅ NODE_ENV=production
✅ NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com
```

---

## 🔐 Seguridad

### Credenciales

- [ ] JWT_SECRET largo y aleatorio (mínimo 32 caracteres)
- [ ] No hay passwords en el código
- [ ] `.env` está en `.gitignore`
- [ ] `.env.example` no contiene valores reales

### HTTPS

- [ ] Backend acepta conexiones HTTPS (Render lo maneja)
- [ ] Frontend hace peticiones HTTPS en producción
- [ ] No hay mixed content warnings

---

## 📊 Monitoreo

### Logging

- [ ] Console.logs importantes presentes
- [ ] Errores se logean correctamente
- [ ] No hay `console.log` de datos sensibles

### Health Checks

- [ ] Endpoint `/health` implementado
- [ ] Retorna status 200 cuando todo está OK
- [ ] Verifica conexión a base de datos

---

## 🧪 Testing Pre-Deploy

### Tests Locales

```bash
# Backend
cd backend
npm run build
npm start  # Verificar que inicia correctamente

# Frontend
cd frontend
npm run build
npm start  # Verificar que sirve en http://localhost:3000

# Admin Panel
cd admin-panel
npm run build
npm start  # Verificar que sirve en http://localhost:3002
```

### Tests de Integración

- [ ] Login funciona correctamente
- [ ] Crear comanda funciona
- [ ] Facturar funciona
- [ ] Reportes cargan sin errores
- [ ] Admin panel puede listar empresas

---

## 📦 Dependencias

### Package.json Verificado

```bash
# Verificar que no hay dependencias rotas
npm install
npm audit

# Actualizar dependencias críticas si hay vulnerabilidades
npm audit fix
```

### Dependencias de Producción

- [ ] Solo dependencias necesarias en `dependencies`
- [ ] Dev dependencies en `devDependencies`
- [ ] No hay paquetes no usados

---

## 🌐 Render Específico

### Root Directory

- [ ] Backend: `backend`
- [ ] Frontend: `frontend`
- [ ] Admin Panel: `admin-panel`

### Build Commands

- [ ] Backend: `npm install && npm run build`
- [ ] Frontend: `npm install && npm run build`
- [ ] Admin Panel: `npm install && npm run build`

### Start Commands

- [ ] Backend: `npm start`
- [ ] Frontend: `npm start`
- [ ] Admin Panel: `npm start`

---

## 🎯 Última Verificación

### URLs Importantes

Anota aquí tus URLs de Render (llenar después de crear servicios):

```
✅ Backend:    https://_______________.onrender.com
✅ Frontend:   https://_______________.onrender.com
✅ Admin:      https://_______________.onrender.com
✅ PostgreSQL: dpg-_______________.oregon-postgres.render.com
```

### Post-Deploy

- [ ] Backend responde en `/health`
- [ ] Frontend carga correctamente
- [ ] Admin panel carga correctamente
- [ ] Login funciona end-to-end
- [ ] No hay errores de CORS en consola
- [ ] Database migraciones ejecutadas

---

## 🚨 Troubleshooting Rápido

**Build falla:**
1. Verificar Root Directory en configuración de Render
2. Ejecutar build localmente para ver errores
3. Verificar que `package.json` tiene scripts correctos

**Application failed to respond:**
1. Verificar que `PORT` se lee de environment
2. Verificar bind a `0.0.0.0`
3. Ver logs en Render para error específico

**CORS errors:**
1. Agregar dominio de producción a lista de allowed origins
2. Redeploy backend
3. Verificar en DevTools que URL de API es correcta

**Database connection failed:**
1. Verificar DATABASE_URL en variables de entorno
2. Usar Internal Database URL (no External)
3. Verificar que base de datos está activa en Render

---

## ✅ Ready para Deploy

Si marcaste todos los checkboxes relevantes, estás listo para seguir la guía en `DEPLOY.md`!

**Próximo paso:** Seguir [`DEPLOY.md`](./DEPLOY.md) sección por sección.

---

**💡 Tip:** Guarda este checklist y úsalo cada vez que hagas deploy de una actualización mayor.
