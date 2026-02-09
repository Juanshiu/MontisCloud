import { db } from '../database/database';

/**
 * Tipos de acción para auditoría de control de acceso
 */
export type AccionAcceso =
  | 'servicio_cerrado_activado'
  | 'servicio_cerrado_desactivado'
  | 'horario_acceso_modificado'
  | 'acceso_bloqueado_servicio_cerrado'
  | 'acceso_bloqueado_fuera_horario';

/**
 * DTO para activar/desactivar servicio cerrado
 */
export interface ToggleServicioCerradoDTO {
  empresaId: string;
  userId: string;
  activar: boolean;
}

/**
 * DTO para configurar horario de acceso
 */
export interface ConfigurarHorarioDTO {
  empresaId: string;
  userId: string;
  activo: boolean;
  horaInicio?: string; // 'HH:MM'
  horaFin?: string;    // 'HH:MM'
}

/**
 * Estado actual del control de acceso de una empresa
 */
export interface EstadoControlAcceso {
  servicio_cerrado: boolean;
  servicio_cerrado_desde: string | null;
  servicio_cerrado_por: string | null;
  servicio_cerrado_por_nombre?: string;
  horario_acceso_activo: boolean;
  horario_acceso_inicio: string | null;
  horario_acceso_fin: string | null;
  plan_actual: string;
  feature_disponible: boolean;
}

/**
 * Servicio de Control de Acceso
 * Gestiona el cierre de servicio y restricción de horarios
 * Feature exclusiva del Plan Profesional o superior
 */
export class ControlAccesoService {

  /**
   * Planes que tienen acceso a la funcionalidad
   */
  private planesPermitidos = ['profesional', 'enterprise'];

  /**
   * Verifica si la empresa tiene acceso a la feature de control de acceso
   */
  async verificarFeatureDisponible(empresaId: string): Promise<boolean> {
    const empresa = await db
      .selectFrom('empresas')
      .select(['plan_actual'])
      .where('id', '=', empresaId)
      .executeTakeFirst();

    if (!empresa) return false;
    return this.planesPermitidos.includes(empresa.plan_actual);
  }

  /**
   * Obtiene el estado actual del control de acceso
   */
  async obtenerEstado(empresaId: string): Promise<EstadoControlAcceso> {
    try {
      const empresa = await db
        .selectFrom('empresas')
        .select([
          'servicio_cerrado',
          'servicio_cerrado_desde',
          'servicio_cerrado_por',
          'horario_acceso_activo',
          'horario_acceso_inicio',
          'horario_acceso_fin',
          'plan_actual'
        ])
        .where('id', '=', empresaId)
        .executeTakeFirstOrThrow();

      // Obtener nombre del usuario que cerró el servicio
      let cerradoPorNombre: string | null = null;
      if (empresa.servicio_cerrado_por) {
        const usuario = await db
          .selectFrom('usuarios')
          .select(['nombre'])
          .where('id', '=', empresa.servicio_cerrado_por)
          .executeTakeFirst();
        cerradoPorNombre = usuario?.nombre || null;
      }

      return {
        servicio_cerrado: empresa.servicio_cerrado as boolean,
        servicio_cerrado_desde: empresa.servicio_cerrado_desde
          ? new Date(empresa.servicio_cerrado_desde as any).toISOString()
          : null,
        servicio_cerrado_por: empresa.servicio_cerrado_por,
        servicio_cerrado_por_nombre: cerradoPorNombre || undefined,
        horario_acceso_activo: empresa.horario_acceso_activo as boolean,
        horario_acceso_inicio: empresa.horario_acceso_inicio as string | null,
        horario_acceso_fin: empresa.horario_acceso_fin as string | null,
        plan_actual: empresa.plan_actual,
        feature_disponible: this.planesPermitidos.includes(empresa.plan_actual)
      };
    } catch (error: any) {
      // Si las columnas no existen aún (migración pendiente), retornar estado por defecto
      if (error.message?.includes('column') || error.code === '42703') {
        console.warn('[CONTROL_ACCESO] Columnas no encontradas, posible migración pendiente');
        const empresa = await db
          .selectFrom('empresas')
          .select(['plan_actual'])
          .where('id', '=', empresaId)
          .executeTakeFirst();
        return {
          servicio_cerrado: false,
          servicio_cerrado_desde: null,
          servicio_cerrado_por: null,
          horario_acceso_activo: false,
          horario_acceso_inicio: null,
          horario_acceso_fin: null,
          plan_actual: empresa?.plan_actual || 'basico',
          feature_disponible: empresa ? this.planesPermitidos.includes(empresa.plan_actual) : false
        };
      }
      throw error;
    }
  }

  /**
   * Activa o desactiva el servicio cerrado
   */
  async toggleServicioCerrado(dto: ToggleServicioCerradoDTO): Promise<EstadoControlAcceso> {
    const { empresaId, userId, activar } = dto;

    // Verificar feature disponible
    const disponible = await this.verificarFeatureDisponible(empresaId);
    if (!disponible) {
      throw Object.assign(new Error('Esta funcionalidad solo está disponible en el Plan Profesional o superior'), {
        codigo: 'FEATURE_NOT_AVAILABLE',
        status: 403
      });
    }

    // Actualizar estado
    const updateData: Record<string, any> = {
      servicio_cerrado: activar,
      updated_at: new Date().toISOString()
    };

    if (activar) {
      updateData.servicio_cerrado_desde = new Date().toISOString();
      updateData.servicio_cerrado_por = userId;
    } else {
      updateData.servicio_cerrado_desde = null;
      updateData.servicio_cerrado_por = null;
    }

    await db
      .updateTable('empresas')
      .set(updateData)
      .where('id', '=', empresaId)
      .execute();

    // Registrar auditoría
    await this.registrarAuditoria({
      empresaId,
      userId,
      accion: activar ? 'servicio_cerrado_activado' : 'servicio_cerrado_desactivado',
      detalles: { activar }
    });

    return this.obtenerEstado(empresaId);
  }

  /**
   * Configura el horario de acceso
   */
  async configurarHorario(dto: ConfigurarHorarioDTO): Promise<EstadoControlAcceso> {
    const { empresaId, userId, activo, horaInicio, horaFin } = dto;

    // Verificar feature disponible
    const disponible = await this.verificarFeatureDisponible(empresaId);
    if (!disponible) {
      throw Object.assign(new Error('Esta funcionalidad solo está disponible en el Plan Profesional o superior'), {
        codigo: 'FEATURE_NOT_AVAILABLE',
        status: 403
      });
    }

    // Validar formato de hora si se activa
    if (activo) {
      if (!horaInicio || !horaFin) {
        throw new Error('Debe especificar hora de inicio y fin cuando el horario está activo');
      }
      if (!this.validarFormatoHora(horaInicio) || !this.validarFormatoHora(horaFin)) {
        throw new Error('Formato de hora inválido. Use HH:MM (24h)');
      }
    }

    const updateData: Record<string, any> = {
      horario_acceso_activo: activo,
      horario_acceso_inicio: activo ? horaInicio : null,
      horario_acceso_fin: activo ? horaFin : null,
      updated_at: new Date().toISOString()
    };

    await db
      .updateTable('empresas')
      .set(updateData)
      .where('id', '=', empresaId)
      .execute();

    // Registrar auditoría
    await this.registrarAuditoria({
      empresaId,
      userId,
      accion: 'horario_acceso_modificado',
      detalles: { activo, horaInicio, horaFin }
    });

    return this.obtenerEstado(empresaId);
  }

  /**
   * Verifica si un usuario no-admin puede acceder al sistema
   * Retorna null si puede acceder, o un objeto de error si está bloqueado
   */
  async verificarAccesoUsuario(
    empresaId: string,
    userId: string,
    esAdmin: boolean
  ): Promise<{ code: string; message: string } | null> {
    // Los administradores siempre pueden acceder
    if (esAdmin) return null;

    const empresa = await db
      .selectFrom('empresas')
      .select([
        'plan_actual',
        'servicio_cerrado',
        'horario_acceso_activo',
        'horario_acceso_inicio',
        'horario_acceso_fin'
      ])
      .where('id', '=', empresaId)
      .executeTakeFirst();

    if (!empresa) return null;

    // Si el plan no es profesional o superior, no aplica esta lógica
    if (!this.planesPermitidos.includes(empresa.plan_actual)) return null;

    // Verificar servicio cerrado manualmente
    if (empresa.servicio_cerrado) {
      // Registrar intento bloqueado
      await this.registrarAuditoria({
        empresaId,
        userId,
        accion: 'acceso_bloqueado_servicio_cerrado',
        detalles: {}
      });

      return {
        code: 'SERVICIO_CERRADO',
        message: 'El servicio se encuentra cerrado por el administrador'
      };
    }

    // Verificar horario de acceso
    if (empresa.horario_acceso_activo && empresa.horario_acceso_inicio && empresa.horario_acceso_fin) {
      const dentroDeHorario = this.estaDentroDeHorario(
        empresa.horario_acceso_inicio as string,
        empresa.horario_acceso_fin as string
      );

      if (!dentroDeHorario) {
        // Registrar intento bloqueado
        await this.registrarAuditoria({
          empresaId,
          userId,
          accion: 'acceso_bloqueado_fuera_horario',
          detalles: {
            hora_actual: this.obtenerHoraActualColombia(),
            rango_permitido: `${empresa.horario_acceso_inicio} - ${empresa.horario_acceso_fin}`
          }
        });

        return {
          code: 'FUERA_DE_HORARIO',
          message: `Fuera del horario de acceso permitido (${empresa.horario_acceso_inicio} - ${empresa.horario_acceso_fin})`
        };
      }
    }

    return null;
  }

  /**
   * Obtiene el historial de auditoría de acceso
   */
  async obtenerHistorialAuditoria(
    empresaId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const registros = await db
      .selectFrom('auditoria_acceso')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const total = await db
      .selectFrom('auditoria_acceso')
      .select(db.fn.countAll().as('count'))
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    return {
      registros,
      total: Number(total?.count || 0),
      limit,
      offset
    };
  }

  // ========================
  // MÉTODOS PRIVADOS
  // ========================

  /**
   * Registra un evento en la auditoría de acceso
   */
  private async registrarAuditoria(params: {
    empresaId: string;
    userId: string;
    accion: AccionAcceso;
    detalles: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      await db
        .insertInto('auditoria_acceso')
        .values({
          empresa_id: params.empresaId,
          usuario_id: params.userId,
          accion: params.accion,
          detalles: JSON.stringify(params.detalles) as any,
          ip_address: params.ip || null,
          user_agent: params.userAgent || null
        })
        .execute();
    } catch (error) {
      // No fallar silenciosamente pero tampoco bloquear la operación principal
      console.error('[AUDITORIA_ACCESO] Error al registrar:', error);
    }
  }

  /**
   * Valida formato de hora HH:MM
   */
  private validarFormatoHora(hora: string): boolean {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(hora);
  }

  /**
   * Obtiene la hora actual en zona horaria de Colombia (America/Bogota)
   */
  private obtenerHoraActualColombia(): string {
    const now = new Date();
    const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const hours = colombiaTime.getHours().toString().padStart(2, '0');
    const minutes = colombiaTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Verifica si la hora actual (Colombia) está dentro del rango permitido
   * Soporta rangos que cruzan medianoche (ej: 22:00 - 06:00)
   */
  private estaDentroDeHorario(inicio: string, fin: string): boolean {
    const horaActual = this.obtenerHoraActualColombia();
    const [hActual, mActual] = horaActual.split(':').map(Number);
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);

    const minutosActual = hActual * 60 + mActual;
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFin = hFin * 60 + mFin;

    // Rango normal (ej: 08:00 - 22:00)
    if (minutosInicio <= minutosFin) {
      return minutosActual >= minutosInicio && minutosActual <= minutosFin;
    }

    // Rango que cruza medianoche (ej: 22:00 - 06:00)
    return minutosActual >= minutosInicio || minutosActual <= minutosFin;
  }
}
