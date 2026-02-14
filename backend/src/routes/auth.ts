/// <reference path="../types/express.d.ts" />
import express, { Request, Response } from 'express';
import { AuthService } from '../services/authService';

const router = express.Router();
const authService = new AuthService();

/**
 * POST /api/auth/login
 * Login multi-tenant: identifica empresa por email del admin, luego email del empleado + password
 * Soporta dos modos:
 * 1. Nuevo: { empresaEmail, usuarioEmail, password } - identifica empresa + empleado por email
 * 2. Legacy: { email, password } - login directo por email (para admins)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { empresaEmail, usuarioEmail, password, email } = req.body;

    // Modo legacy: login directo por email (para admins o compatibilidad)
    if (email && password && !empresaEmail) {
      const resultado = await authService.login(email, password);
      return res.json(resultado);
    }

    // Modo nuevo: empresaEmail + usuarioEmail + password
    if (!empresaEmail || !usuarioEmail || !password) {
      return res.status(400).json({ 
        error: 'Se requiere: empresaEmail (correo de la empresa), tu email y contraseña' 
      });
    }

    const resultado = await authService.loginMultiTenant(empresaEmail, usuarioEmail, password);
    return res.json(resultado);

  } catch (error: any) {
    const errorMessage = typeof error?.message === 'string'
      ? error.message
      : (typeof error === 'string' ? error : 'Error interno del servidor');

    console.error('Login error:', errorMessage, error);
    
    // Determinar status code apropiado
    let status = 500;
    const msgNormalized = errorMessage.toLowerCase();

    if (
      msgNormalized.includes('inválid') ||
      msgNormalized.includes('inválid') ||
      msgNormalized.includes('no encontrad') ||
      msgNormalized.includes('credenciales') ||
      msgNormalized.includes('usuario desactivado') ||
      msgNormalized.includes('empresa no encontrada')
    ) {
      status = 401;
    } else if (error.codigo) {
      // Errores de licencia son 403 (Forbidden)
      status = 403;
    } else if (msgNormalized.includes('requiere') || msgNormalized.includes('requerid')) {
      status = 400;
    }
    
    return res.status(status).json({ 
      error: errorMessage,
      codigo: error.codigo || null
    });
  }
});

// Endpoint para validar token (útil para frontend al recargar)
// Requiere auth middleware (que valida el token en si)
import { verificarAutenticacion } from '../middleware/authMiddleware';

router.get('/validar', verificarAutenticacion, (req: Request, res: Response) => {
  const context = req.context;
  res.json({
    valid: true,
    usuario: {
      id: context.userId,
      empresaId: context.empresaId,
      rol: context.rol
    },
    permisos: context.permisos
  });
});

// Alias para compatibilidad con el frontend
router.get('/session', verificarAutenticacion, (req: Request, res: Response) => {
  const context = req.context;
  res.json({
    usuario: {
      id: context.userId,
      nombre_completo: context.nombre,
      usuario: context.email,
      email: context.email,
      empresa_id: context.empresaId,
      rol_nombre: context.rol.nombre
    },
    permisos: context.permisos || []
  });
});

export default router;
