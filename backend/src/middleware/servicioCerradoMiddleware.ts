import { Request, Response, NextFunction } from 'express';
import { ControlAccesoService } from '../services/controlAccesoService';

const controlAccesoService = new ControlAccesoService();

/**
 * Middleware que verifica las restricciones de control de acceso:
 * 1. Servicio cerrado manualmente → bloquea no-admins
 * 2. Fuera de horario de acceso → bloquea no-admins
 * 
 * Requisitos:
 * - Debe ejecutarse DESPUÉS de verificarAutenticacion (necesita req.context)
 * - Administradores siempre pasan
 * - Solo aplica a empresas con Plan Profesional o superior
 * 
 * Orden de ejecución recomendado en el middleware chain:
 * verificarAutenticacion → verificarServicioCerrado → ... rutas
 */
export const verificarServicioCerrado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // El middleware de auth ya debe haber inyectado el contexto
    if (!req.context) {
      next();
      return;
    }

    const { userId, empresaId, rol } = req.context;

    // Determinar si el usuario es admin
    const rolesAdmin = ['Administrador', 'Super Admin', 'Admin', 'Master'];
    const esAdmin = rolesAdmin.includes(rol.nombre) || rol.es_superusuario === true;

    // Verificar acceso
    const bloqueo = await controlAccesoService.verificarAccesoUsuario(
      empresaId,
      userId,
      esAdmin
    );

    if (bloqueo) {
      res.status(403).json({
        error: bloqueo.message,
        code: bloqueo.code,
        codigo: bloqueo.code // compatibilidad con frontend existente
      });
      return;
    }

    next();
  } catch (error) {
    // Si hay un error en la verificación, no bloquear — permitir acceso y loguear
    console.error('[SERVICIO_CERRADO_MW] Error:', error);
    next();
  }
};

/**
 * Middleware que verifica si la feature de control de acceso está disponible
 * para la empresa. Retorna 403 si el plan no lo permite.
 * 
 * Uso: en rutas de configuración del servicio cerrado
 */
export const verificarFeatureControlAcceso = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.context) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const disponible = await controlAccesoService.verificarFeatureDisponible(req.context.empresaId);

    if (!disponible) {
      res.status(403).json({
        error: 'Esta funcionalidad requiere el Plan Profesional o superior',
        code: 'FEATURE_NOT_AVAILABLE',
        codigo: 'FEATURE_NOT_AVAILABLE'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[FEATURE_CONTROL_ACCESO_MW] Error:', error);
    res.status(500).json({ error: 'Error al verificar disponibilidad de feature' });
  }
};
