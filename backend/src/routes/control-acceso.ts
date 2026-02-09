import express, { Request, Response } from 'express';
import { verificarAutenticacion, verificarSuperUsuario } from '../middleware/authMiddleware';
import { verificarFeatureControlAcceso } from '../middleware/servicioCerradoMiddleware';
import { ControlAccesoService } from '../services/controlAccesoService';

const router = express.Router();
const controlAccesoService = new ControlAccesoService();

// Todas las rutas requieren autenticación + rol admin
router.use(verificarAutenticacion);

/**
 * GET /api/control-acceso/estado
 * Obtiene el estado actual del control de acceso de la empresa.
 * Disponible para todos los usuarios autenticados (para saber si la feature existe).
 */
router.get('/estado', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const estado = await controlAccesoService.obtenerEstado(empresaId);
    res.json(estado);
  } catch (error: any) {
    console.error('[CONTROL_ACCESO] Error al obtener estado:', error);
    res.status(500).json({ error: 'Error al obtener estado del control de acceso' });
  }
});

/**
 * POST /api/control-acceso/servicio-cerrado
 * Activa o desactiva el cierre de servicio.
 * Requiere: admin + Plan Profesional+
 * Body: { activar: boolean }
 */
router.post('/servicio-cerrado',
  verificarSuperUsuario,
  verificarFeatureControlAcceso,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, userId } = req.context;
      const { activar } = req.body;

      if (typeof activar !== 'boolean') {
        return res.status(400).json({ error: 'El campo "activar" es requerido (boolean)' });
      }

      const estado = await controlAccesoService.toggleServicioCerrado({
        empresaId,
        userId,
        activar
      });

      res.json({
        mensaje: activar
          ? 'Servicio cerrado correctamente. Los empleados no podrán acceder.'
          : 'Servicio abierto. Los empleados pueden acceder nuevamente.',
        estado
      });
    } catch (error: any) {
      console.error('[CONTROL_ACCESO] Error al toggle servicio:', error);
      if (error.codigo === 'FEATURE_NOT_AVAILABLE') {
        return res.status(403).json({ error: error.message, codigo: error.codigo });
      }
      res.status(500).json({ error: error.message || 'Error al cambiar estado del servicio' });
    }
  }
);

/**
 * PUT /api/control-acceso/horario
 * Configura el horario de acceso.
 * Requiere: admin + Plan Profesional+
 * Body: { activo: boolean, horaInicio?: string, horaFin?: string }
 */
router.put('/horario',
  verificarSuperUsuario,
  verificarFeatureControlAcceso,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, userId } = req.context;
      const { activo, horaInicio, horaFin } = req.body;

      if (typeof activo !== 'boolean') {
        return res.status(400).json({ error: 'El campo "activo" es requerido (boolean)' });
      }

      const estado = await controlAccesoService.configurarHorario({
        empresaId,
        userId,
        activo,
        horaInicio,
        horaFin
      });

      res.json({
        mensaje: activo
          ? `Horario de acceso configurado: ${horaInicio} - ${horaFin}`
          : 'Restricción de horario desactivada',
        estado
      });
    } catch (error: any) {
      console.error('[CONTROL_ACCESO] Error al configurar horario:', error);
      if (error.codigo === 'FEATURE_NOT_AVAILABLE') {
        return res.status(403).json({ error: error.message, codigo: error.codigo });
      }
      res.status(400).json({ error: error.message || 'Error al configurar horario de acceso' });
    }
  }
);

/**
 * GET /api/control-acceso/auditoria
 * Obtiene el historial de auditoría de acceso.
 * Requiere: admin + Plan Profesional+
 * Query: ?limit=50&offset=0
 */
router.get('/auditoria',
  verificarSuperUsuario,
  verificarFeatureControlAcceso,
  async (req: Request, res: Response) => {
    try {
      const { empresaId } = req.context;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const historial = await controlAccesoService.obtenerHistorialAuditoria(empresaId, limit, offset);
      res.json(historial);
    } catch (error: any) {
      console.error('[CONTROL_ACCESO] Error al obtener auditoría:', error);
      res.status(500).json({ error: 'Error al obtener historial de auditoría' });
    }
  }
);

export default router;
