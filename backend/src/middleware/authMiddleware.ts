import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { db } from '../database/database';

const authService = new AuthService();

/**
 * Middleware para verificar que el usuario esté autenticado mediante JWT
 * Valida el token, integridad de usuario, estado de la empresa y eliminación lógica.
 * 
 * ✅ Soporta tokens de impersonación (modo soporte)
 * Cuando impersonated = true, se mantienen permisos del usuario impersonado
 * pero se registra el originalAdminId para trazabilidad
 */
export const verificarAutenticacion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('[AUTH] Petición recibida:', req.method, req.path);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No se proporcionó token de autenticación' });
      return;
    }

    const token = authHeader.substring(7);

    // 1. Verificar firma JWT
    let decoded: any;
    try {
      decoded = authService.verifyToken(token);
      console.log('[AUTH] Token decodificado exitosamente, userId:', decoded.userId, 'empresaId:', decoded.empresaId, 'impersonated:', decoded.impersonated);
    } catch (err: any) {
      console.error('[AUTH] Error al verificar token:', err);
      // Diferenciar token expirado de token inválido
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ 
          error: 'Tu sesión ha expirado por seguridad. Inicia sesión nuevamente.',
          code: 'TOKEN_EXPIRED',
          codigo: 'TOKEN_EXPIRED'
        });
        return;
      }
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    // Detectar si es token de impersonación
    const isImpersonation = decoded.impersonated === true;
    const { userId, empresaId } = decoded;

    // LOG: Debug impersonación
    if (isImpersonation) {
      console.log('[AUTH DEBUG] Token de impersonación detectado:', {
        userId,
        empresaId,
        originalAdminId: decoded.originalAdminId,
        originalAdminEmail: decoded.originalAdminEmail
      });
    }

    // 2. Validar existencia, estado y eliminación lógica en DB
    // ⚠️ CRÍTICO: Verificar deleted_at para bloquear empresas eliminadas
    console.log('[AUTH] Iniciando query de validación usuario...');
    const usuarioValidado = await db
      .selectFrom('usuarios')
      .innerJoin('empresas', 'empresas.id', 'usuarios.empresa_id')
      .leftJoin('roles', 'roles.id', 'usuarios.rol_id')
      .select([
        'usuarios.id as uid', 
        'usuarios.nombre as u_nombre',
        'usuarios.email as u_email',
        'usuarios.activo as u_activo',
        'usuarios.rol_id',
        'empresas.id as eid', 
        'empresas.estado as e_estado',
        'empresas.deleted_at as e_deleted_at',
        'roles.nombre as r_nombre'
      ])
      .where('usuarios.id', '=', userId)
      .where('usuarios.empresa_id', '=', empresaId)
      .executeTakeFirst();
    
    console.log('[AUTH] Query de validación completada');

    // LOG: Debug resultado validación
    if (isImpersonation) {
      console.log('[AUTH DEBUG] Resultado validación usuario:', {
        encontrado: !!usuarioValidado,
        uid: usuarioValidado?.uid,
        eid: usuarioValidado?.eid,
        activo: usuarioValidado?.u_activo,
        empresa_eliminada: !!usuarioValidado?.e_deleted_at
      });
    }

    if (!usuarioValidado) {
       res.status(401).json({ error: 'Usuario o Empresa no encontrados' });
       return;
    }

    // ⚠️ CRÍTICO: Bloquear acceso si la empresa fue eliminada
    if (usuarioValidado.e_deleted_at) {
       res.status(403).json({ 
         error: 'La empresa ha sido desactivada permanentemente',
         codigo: 'EMPRESA_ELIMINADA'
       });
       return;
    }

    if (!usuarioValidado.u_activo) {
       res.status(403).json({ error: 'Usuario desactivado' });
       return;
    }

    if (usuarioValidado.e_estado !== 'activo') {
       res.status(403).json({ error: 'Empresa suspendida o inactiva' });
       return;
    }

    // 2.5. Verificar estado de licencia activa
    const licenciaActiva = await db
      .selectFrom('licencias')
      .select(['estado', 'fecha_fin'])
      .where('empresa_id', '=', empresaId)
      .where('estado', 'in', ['activo', 'prueba', 'pausado', 'expirado'])
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (licenciaActiva) {
      // Verificar si la licencia está en un estado que bloquea acceso
      if (licenciaActiva.estado === 'pausado') {
        res.status(403).json({ 
          error: 'Licencia pausada temporalmente. Contacte al administrador.',
          codigo: 'LICENCIA_PAUSADA'
        });
        return;
      }

      if (licenciaActiva.estado === 'expirado') {
        // En modo impersonación, permitir acceso aunque licencia esté expirada (modo soporte)
        if (!isImpersonation) {
          res.status(403).json({ 
            error: 'Licencia expirada. Contacte al administrador para renovar.',
            codigo: 'LICENCIA_EXPIRADA'
          });
          return;
        }
      }

      // Verificar si la licencia activa/prueba ha expirado por fecha
      if (licenciaActiva.fecha_fin) {
        const fechaFin = new Date(licenciaActiva.fecha_fin as any);
        if (fechaFin < new Date() && !isImpersonation) {
          res.status(403).json({ 
            error: 'Licencia expirada. Contacte al administrador para renovar.',
            codigo: 'LICENCIA_EXPIRADA'
          });
          return;
        }
      }
    } else {
      // No hay licencia activa - permitir en modo impersonación
      if (!isImpersonation) {
        res.status(403).json({ 
          error: 'Sin licencia activa. Contacte al administrador.',
          codigo: 'SIN_LICENCIA'
        });
        return;
      }
    }

    // 3. Cargar permisos reales
    const permisosData = await db
      .selectFrom('permisos_rol')
      .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
      .select('permisos.clave')
      .where('permisos_rol.rol_id', '=', usuarioValidado.rol_id || '')
      .where('permisos_rol.empresa_id', '=', empresaId)
      .execute();

    const permisosList = permisosData.map(p => p.clave);

    // 4. Inyectar Contexto SaaS (incluyendo info de impersonación si aplica)
    req.context = {
      userId: userId,
      empresaId: empresaId,
      nombre: usuarioValidado.u_nombre || 'Usuario',
      email: usuarioValidado.u_email || '',
      rol: {
        id: usuarioValidado.rol_id || '',
        nombre: usuarioValidado.r_nombre || 'Sin Rol'
      },
      permisos: permisosList,
      // Campos de impersonación
      impersonated: isImpersonation,
      originalAdminId: isImpersonation ? decoded.originalAdminId : undefined,
      originalAdminEmail: isImpersonation ? decoded.originalAdminEmail : undefined
    };

    next();
  } catch (error) {
    console.error('Error crítico auth middleware:', error);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

/**
 * Middleware para verificar permisos
 * Ahora incluye fallback a roles comunes para compatibilidad
 */
export const verificarPermiso = (permisoRequerido: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) {
        res.status(401).json({ error: 'Contexto de seguridad no inicializado' });
        return;
      }

      const { rol, empresaId } = req.context;

      if (!rol.id) {
          res.status(403).json({ error: 'Usuario sin rol asignado' });
          return;
      }

      // 1. Verificar permiso específico en la tabla permisos_rol
      const tienePermiso = await db.selectFrom('permisos_rol')
          .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
          .select('permisos.id')
          .where('permisos_rol.rol_id', '=', rol.id)
          .where('permisos_rol.empresa_id', '=', empresaId)
          .where('permisos.clave', '=', permisoRequerido)
          .executeTakeFirst();

      if (tienePermiso) {
        next();
        return;
      }

      // 2. Fallback: Si el permiso requerido es 'admin', verificar si el rol es Administrador
      if (permisoRequerido === 'admin') {
        const rolesAdmin = ['Administrador', 'Super Admin', 'Admin', 'Master'];
        if (rolesAdmin.includes(rol.nombre)) {
          next();
          return;
        }
      }

      // 3. Fallback adicional: buscar cualquier permiso que contenga la palabra clave
      const tienePermisoSimilar = await db.selectFrom('permisos_rol')
          .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
          .select('permisos.id')
          .where('permisos_rol.rol_id', '=', rol.id)
          .where('permisos_rol.empresa_id', '=', empresaId)
          .where((eb) => eb.or([
            eb('permisos.clave', 'like', `%${permisoRequerido}%`),
            eb('permisos.clave', '=', 'admin'),
            eb('permisos.clave', '=', 'super_admin')
          ]))
          .executeTakeFirst();

      if (tienePermisoSimilar) {
        next();
        return;
      }

      res.status(403).json({ 
        error: 'No tienes permiso para realizar esta acción',
        permiso_requerido: permisoRequerido
      });

    } catch (error) {
      console.error('Error en middleware de permisos:', error);
      res.status(500).json({ error: 'Error interno al verificar permisos' });
    }
  };
};

/**
 * Middleware para verificar privilegios de administrador/superusuario
 * En SaaS, verificamos si tiene permiso 'admin_sistema' o rol 'Super Admin'
 */
export const verificarSuperUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.context) {
      res.status(401).json({ error: 'Contexto de seguridad no inicializado' });
      return;
    }
    
    // Check if role is 'Super Admin' or has permission 'admin_sistema'
    // This is temporary logic until proper migration
    const { rol } = req.context;
    
    if (rol.nombre === 'Super Admin' || rol.nombre === 'Administrador' || rol.nombre === 'Master') {
        next();
        return;
    }
    
    // Also check permissions if we loaded them
    // For now, strict check on Role Name for safety
    
    res.status(403).json({ error: 'Acceso restringido a administradores' });
  } catch (error) {
    console.error('Error en middleware de superusuario:', error);
    res.status(500).json({ error: 'Error interno de autorización' });
  }
};
