/**
 * Tipos para el Sistema SaaS Admin
 * FASE 2.2 - Consolidación SaaS
 * FASE 2.3 - Panel Master Admin Avanzado
 */

// ============================================
// ENUMS Y TIPOS BASE
// ============================================

// Planes disponibles
export type PlanType = 'basico' | 'profesional' | 'enterprise';

// Configuración de un plan de licencia
export interface PlanConfig {
  id: PlanType;
  nombre: string;
  descripcion: string;
  precio_anual: number; // En COP
  max_usuarios: number;
  max_mesas: number;
  duracion_dias: number; // Por defecto 365
  features: Record<string, boolean>;
  activo: boolean;
}

// Estados de licencia (sin moroso - no se usa pagos por cuotas)
export type LicenciaEstado = 'activo' | 'suspendido' | 'expirado' | 'prueba' | 'pausado';

// Estados de empresa
export type EmpresaEstado = 'activo' | 'suspendido' | 'pendiente' | 'prueba' | 'expirado';

// Orígenes de empresa
export type EmpresaOrigen = 'manual' | 'api' | 'migracion';

// Tipos de acción para auditoría
export type AuditoriaAccion = 
  | 'empresa_creada'
  | 'empresa_suspendida'
  | 'empresa_activada'
  | 'empresa_eliminada'
  | 'licencia_creada'
  | 'licencia_extendida'
  | 'licencia_pausada'
  | 'licencia_reanudada'
  | 'licencia_plan_cambiado'
  | 'licencia_cancelada'
  | 'admin_password_reset'
  | 'admin_email_cambiado'
  | 'admin_bloqueado'
  | 'admin_desbloqueado'
  | 'credenciales_reenviadas'
  | 'sesiones_forzadas_cierre'
  | 'impersonacion_iniciada'
  | 'impersonacion_finalizada'
  | 'usuarios_desactivados'
  | 'servicio_cerrado_activado'
  | 'servicio_cerrado_desactivado'
  | 'horario_acceso_modificado';

// Motivos predefinidos para eliminación de empresa
export type MotivoEliminacionEmpresa = 
  | 'solicitud_cliente'
  | 'incumplimiento_pago'
  | 'violacion_terminos'
  | 'fraude_detectado'
  | 'empresa_duplicada'
  | 'cierre_negocio'
  | 'otro';

// DTO para eliminar empresa (soft delete)
export interface EliminarEmpresaDTO {
  empresaId: string;
  motivo: MotivoEliminacionEmpresa;
  motivoDetalle?: string; // Detalle adicional obligatorio si motivo es 'otro'
  confirmacionTexto: string; // Debe ser exactamente "ELIMINAR <NOMBRE_EMPRESA>"
  passwordAdmin: string; // Password del super admin para revalidación
}

// Respuesta de eliminación de empresa
export interface EmpresaEliminadaResponse {
  success: boolean;
  mensaje: string;
  empresaId: string;
  empresaNombre: string;
  fechaEliminacion: Date;
  usuariosDesactivados: number;
  sesionesInvalidadas: number;
  licenciaCancelada: boolean;
}

// DTO para crear empresa
export interface CrearEmpresaDTO {
  nombre: string;
  emailAdmin: string;
  nombreAdmin: string;
  telefono?: string;
  direccion?: string;
  plan?: PlanType;
  diasPrueba?: number;
}

// DTO para actualizar empresa
export interface ActualizarEmpresaDTO {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  email_contacto?: string;
  estado?: EmpresaEstado;
}

// DTO para crear licencia
export interface CrearLicenciaDTO {
  empresaId: string;
  plan: PlanType;
  duracionDias: number;  // Días de licencia (365 = 1 año)
  esPrueba?: boolean;    // Si es periodo de prueba
  maxUsuarios?: number;
  maxMesas?: number;
  features?: Record<string, boolean>;
  notas?: string;
}

// Respuesta de empresa con detalles
export interface EmpresaConDetalles {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  plan_actual: string;
  max_usuarios: number;
  email_contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  created_at: Date;
  licencia_activa: LicenciaResumen | null;
  usuarios_count: number;
}

// Resumen de licencia
export interface LicenciaResumen {
  id: string;
  plan: string;
  estado: string;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  dias_restantes: number | null;
}

// Resultado de creación de tenant
export interface TenantCreado {
  empresa: {
    id: string;
    nombre: string;
    slug: string;
  };
  usuarioAdmin: {
    id: string;
    nombre: string;
    email: string;
    passwordTemporal: string;
  };
  licencia: {
    id: string;
    plan: string;
    fecha_fin: Date | null;
  } | null;
}

// Payload del token para super admin
export interface SuperAdminTokenPayload {
  userId: string;
  isSuperAdmin: true;
  exp?: number;
}

// Estadísticas del dashboard admin
export interface DashboardStats {
  empresas: {
    total: number;
    activas: number;
    suspendidas: number;
    enPrueba: number;
  };
  licencias: {
    activas: number;
    porExpirar: number; // próximos 30 días
    expiradas: number;
  };
  usuarios: {
    total: number;
  };
}

// ============================================
// TIPOS EXTENDIDOS - FASE 2.3
// ============================================

// Detalle completo de empresa (Tenant Detail)
export interface EmpresaDetalleCompleto {
  // Datos generales
  id: string;
  nombre: string;
  slug: string;
  email_contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  plan_actual: string;
  estado: EmpresaEstado;
  created_at: Date;
  updated_at: Date | null;
  
  // Licencia activa
  licencia: LicenciaDetalle | null;
  
  // Historial de licencias
  historial_licencias: LicenciaHistorial[];
  
  // Admin principal (owner)
  admin_principal: AdminPrincipal | null;
  
  // Métricas rápidas
  metricas: MetricasEmpresa;
  
  // Estado y salud
  salud: SaludEmpresa;
  
  // Usuarios resumidos
  usuarios_resumen: UsuarioResumenSaaS[];
}

// Detalle de licencia
export interface LicenciaDetalle {
  id: string;
  plan: PlanType;
  estado: LicenciaEstado;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  dias_restantes: number | null;
  max_usuarios: number;
  max_mesas: number;
  features: Record<string, boolean>;
  notas: string | null;
  created_at: Date;
}

// Historial de licencia
export interface LicenciaHistorial {
  id: string;
  plan: PlanType;
  estado: LicenciaEstado;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  notas: string | null;
}

// Admin principal de la empresa
export interface AdminPrincipal {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  ultimo_login: Date | null;
  bloqueado: boolean;
}

// Métricas de empresa
export interface MetricasEmpresa {
  total_usuarios: number;
  usuarios_activos: number;
  ultimo_login_empresa: Date | null;
  total_comandas: number;
  comandas_ultimo_mes: number;
  total_facturas: number;
  ultima_comanda: Date | null;
  ultima_factura: Date | null;
}

// Estado de salud de la empresa
export interface SaludEmpresa {
  ultimo_acceso: Date | null;
  dias_sin_acceso: number | null;
  estado_inventario: 'ok' | 'bajo_stock' | 'sin_stock' | 'no_usa';
  alertas_activas: AlertaSaaS[];
  errores_recientes: number;
}

// Alerta SaaS
export interface AlertaSaaS {
  tipo: 'licencia_expira' | 'sin_actividad' | 'error_critico' | 'limite_usuarios' | 'inventario_critico';
  mensaje: string;
  severidad: 'info' | 'warning' | 'danger';
  fecha: Date;
}

// Usuario resumen para vista SaaS
export interface UsuarioResumenSaaS {
  id: string;
  nombre: string;
  email: string;
  rol_nombre: string | null;
  activo: boolean;
  ultimo_login: Date | null;
}

// ============================================
// DTOs EXTENDIDOS - ACCIONES
// ============================================

// DTO para extender licencia
export interface ExtenderLicenciaDTO {
  licenciaId: string;
  dias: number;
  motivo?: string;
}

// DTO para cambiar plan
export interface CambiarPlanDTO {
  empresaId: string;
  nuevoPlan: PlanType;
  motivo?: string;
}

// DTO para resetear password
export interface ResetPasswordDTO {
  usuarioId: string;
  empresaId: string;
  enviarEmail?: boolean;
}

// DTO para cambiar email admin
export interface CambiarEmailAdminDTO {
  usuarioId: string;
  empresaId: string;
  nuevoEmail: string;
}

// DTO para registro de auditoría
export interface CrearAuditoriaDTO {
  accion: AuditoriaAccion;
  empresa_id?: string;
  usuario_afectado_id?: string;
  detalles: Record<string, any>;
  admin_id: string;
  admin_email: string;
}

// Registro de auditoría
export interface AuditoriaRegistro {
  id: string;
  accion: AuditoriaAccion;
  empresa_id: string | null;
  empresa_nombre: string | null;
  usuario_afectado_id: string | null;
  detalles: Record<string, any>;
  admin_id: string;
  admin_email: string;
  created_at: Date;
}

// Respuesta de operación con password temporal
export interface OperacionConPassword {
  success: boolean;
  mensaje: string;
  passwordTemporal?: string;
}

// Límites por plan
export interface LimitesPlan {
  plan: PlanType;
  max_usuarios: number;
  max_mesas: number;
  features: string[];
}
