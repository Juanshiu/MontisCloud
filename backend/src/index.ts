/// <reference path="./types/express.d.ts" />
import dotenv from 'dotenv';

// Cargar variables de entorno PRIMERO
dotenv.config();

// Validar variables de entorno ANTES de cualquier otra importación
import { enforceEnvironment } from './config/envValidator';
enforceEnvironment();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { db } from './database/database';
import { verificarServicioCerrado } from './middleware/servicioCerradoMiddleware';
import authRoutes from './routes/auth';
import usuariosRoutes from './routes/usuarios';
import rolesRoutes from './routes/roles';
import mesasRoutes from './routes/mesas';
import salonesRoutes from './routes/salones';
import productosRoutes from './routes/productos';
import categoriasRoutes from './routes/categorias';
import comandasRoutes from './routes/comandas';
import facturasRoutes from './routes/facturas';
import reportesRoutes from './routes/reportes';
import personalizacionesRoutes from './routes/personalizaciones';
import sistemaRoutes from './routes/sistema';
import configuracionFacturacionRoutes from './routes/configuracion-facturacion';
import configuracionSistemaRoutes from './routes/configuracion-sistema';
import inventarioAvanzadoRoutes from './routes/inventario-avanzado';
import proveedoresRoutes from './routes/proveedores';
import insumoCategoriasRoutes from './routes/insumo-categorias';
import empleadosRoutes from './routes/empleados';
import nominaRoutes from './routes/nomina';
import contratosRoutes from './routes/contratos';
import controlAccesoRoutes from './routes/control-acceso';
import adminRoutes from './routes/admin'; // Panel Master Admin SaaS
import printRoutes from './routes/print';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middlewares
app.use(helmet());
app.use(compression());

// Configuración de CORS
const normalizeOrigin = (value: string) => value.replace(/\/+$/, '');

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
].map(normalizeOrigin);

const allowedOriginStrings = Array.from(
  new Set([...defaultOrigins, ...configuredOrigins])
);

const allowedOriginPatterns = [
  // IPs locales (desarrollo en red local)
  /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/,
];

console.log(`🌐 CORS allowed origins: ${allowedOriginStrings.join(', ')}`);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como Postman, curl, o server-to-server)
    if (!origin) return callback(null, true);
    
    // Verificar si está en la lista de orígenes permitidos
    const normalizedOrigin = normalizeOrigin(origin);

    const isAllowedByString = allowedOriginStrings.includes(normalizedOrigin);
    const isAllowedByPattern = allowedOriginPatterns.some((pattern) => pattern.test(normalizedOrigin));
    const isAllowed = isAllowedByString || isAllowedByPattern;
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // Panel Master Admin SaaS (sin auth de empresa)
app.use('/api/control-acceso', controlAccesoRoutes); // Control de acceso (servicio cerrado)

// Middleware de servicio cerrado para rutas operativas
// Se aplica DESPUÉS de auth (que ya ocurre en cada ruta) pero ANTES del handler
// Solo aplica a rutas que usen verificarAutenticacion internamente
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/salones', salonesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/comandas', comandasRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/personalizaciones', personalizacionesRoutes);
app.use('/api/sistema', sistemaRoutes);
app.use('/api/configuracion/facturacion', configuracionFacturacionRoutes);
app.use('/api/configuracion/sistema', configuracionSistemaRoutes);
app.use('/api/inventario-avanzado', inventarioAvanzadoRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/insumo-categorias', insumoCategoriasRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/nomina', nominaRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/print', printRoutes);

app.get('/health', async (req, res) => {
  try {
    // Simple verification query
    await db.selectFrom('empresas').select('id').limit(1).execute();
    res.json({ status: 'OK', db: 'Connected', uptime: process.uptime() });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', db: 'Disconnected', error: String(error) });
  }
});

// Manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

async function startServer() {
  try {
    // Verificar conexión DB
    console.log('🔄 Conectando a Base de Datos PostgreSQL...');
    // We execute a simple query. If tables don't exist yet, this might fail unless migrator ran.
    // In dev, we might want to run migrations automatically, but for production usually separate.
    // Let's assume migrations are run via script.
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor SaaS ejecutándose en puerto ${PORT}`);
      console.log(`   http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar:', error);
    process.exit(1);
  }
}

startServer();

export default app;
