import { Generated, JSONColumnType, ColumnType } from 'kysely'

export interface PermisosTable {
  id: Generated<number>
  nombre: string
  clave: string
  descripcion: string | null
}

export interface SesionesTable {
  id: Generated<string>
  empresa_id: string | null
  token: string
  usuario_id: string
  created_at: Generated<Timestamp>
  expires_at: Timestamp
}

export interface Database {
  empresas: EmpresasTable
  usuarios: UsuariosTable
  roles: RolesTable
  permisos: PermisosTable
  permisos_rol: PermisosRolTable
  licencias: LicenciasTable
  printers: PrintersTable
  print_jobs: PrintJobsTable
  print_pairing_tokens: PrintPairingTokensTable
  salones: SalonesTable
  mesas: MesasTable
  categorias_productos: CategoriasProductosTable
  productos: ProductosTable
  insumos: InsumosTable
  producto_insumos: ProductoInsumosTable
  historial_inventario: HistorialInventarioTable
  comandas: ComandasTable
  comanda_items: ComandaItemsTable
  comanda_mesas: ComandaMesasTable
  facturas: FacturasTable
  config_facturacion: ConfigFacturacionTable
  proveedores: ProveedoresTable
  categorias_personalizacion: CategoriasPersonalizacionTable
  items_personalizacion: ItemsPersonalizacionTable
  personalizacion_insumos: PersonalizacionInsumosTable
  insumo_categorias: InsumoCategoriasTable
  insumo_historial: InsumoHistorialTable
  empleados: EmpleadosTable
  nominas: NominasTable
  nomina_detalles: NominaDetallesTable
  contratos: ContratosTable
  plantillas_contrato: PlantillasContratoTable
  config_sistema: ConfigSistemaTable
  configuracion_nomina: ConfiguracionNominaTable
  sesiones: SesionesTable
  auditoria_saas: AuditoriaSaasTable
  auditoria_acceso: AuditoriaAccesoTable
  nomina_pagos: NominaPagosTable
}

export type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface EmpresasTable {
  id: Generated<string> // UUID
  nombre: string
  slug: string
  direccion: string | null
  telefono: string | null
  email_contacto: string | null
  licencia_ini: Timestamp | null
  licencia_fin: Timestamp | null
  estado: string // 'activo', 'suspendido'
  licencia_activa: Generated<boolean>
  plan_actual: Generated<string> // 'basico', 'profesional', 'enterprise'
  max_usuarios: Generated<number>
  origen: Generated<string> // 'manual', 'api', 'migracion'
  // Campos de soft delete
  deleted_at: Timestamp | null // NULL = no eliminada
  deleted_by: string | null // UUID del super admin que eliminó
  delete_reason: string | null // Motivo obligatorio de eliminación
  // Campos de Servicio Cerrado (Plan Profesional+)
  servicio_cerrado: Generated<boolean>
  servicio_cerrado_desde: Timestamp | null
  servicio_cerrado_por: string | null // UUID del admin que cerró
  horario_acceso_activo: Generated<boolean>
  horario_acceso_inicio: string | null // formato 'HH:MM'
  horario_acceso_fin: string | null // formato 'HH:MM'
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface UsuariosTable {
  id: Generated<string> // UUID
  empresa_id: string
  nombre: string
  usuario: string // Nombre de usuario único por empresa
  email: string
  password_hash: string
  rol_id: string | null
  activo: boolean
  is_super_admin: Generated<boolean> // Para super admin SaaS
  ultimo_login: Timestamp | null // Último login del usuario
  bloqueado: Generated<boolean> // Bloqueado sin suspender empresa
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

// Tabla de licencias SaaS
export interface LicenciasTable {
  id: Generated<string> // UUID
  empresa_id: string
  plan: string // 'basico', 'profesional', 'enterprise'
  fecha_inicio: Timestamp
  fecha_fin: Timestamp | null
  estado: string // 'activo', 'suspendido', 'expirado', 'pausado', 'moroso'
  max_usuarios: number | null
  max_mesas: number | null
  features: JSONColumnType<Record<string, boolean> | null>
  notas: string | null
  fecha_pausa: Timestamp | null // Fecha en que se pausó
  dias_pausados: Generated<number> // Días acumulados de pausa
  motivo_cambio: string | null // Motivo del último cambio
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

// ==================== IMPRESIÓN REMOTA ====================

export interface PrintersTable {
  id: Generated<string>
  empresa_id: string
  name: string
  api_key_hash: string
  device_fingerprint: string | null
  hostname: string | null
  os_name: string | null
  last_pairing_at: Timestamp | null
  meta: ColumnType<Record<string, any> | null, Record<string, any> | null, Record<string, any> | null>
  is_default: Generated<boolean>
  activo: Generated<boolean>
  last_seen_at: Timestamp | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface PrintPairingTokensTable {
  id: Generated<string>
  empresa_id: string
  token_hash: string
  alias: string | null
  expires_at: Timestamp
  used_at: Timestamp | null
  used_by_printer_id: string | null
  created_by_usuario_id: string | null
  created_at: Generated<Timestamp>
}

export interface PrintJobsTable {
  id: Generated<string>
  printer_id: string
  empresa_id: string
  external_id: string
  type: string
  payload: ColumnType<Record<string, any>, Record<string, any>, Record<string, any>>
  status: Generated<string>
  attempts: Generated<number>
  last_error: string | null
  info: string | null
  printed_at: Timestamp | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

// Tabla de auditoría SaaS
export interface AuditoriaSaasTable {
  id: Generated<string>
  accion: string
  empresa_id: string | null
  usuario_afectado_id: string | null
  detalles: JSONColumnType<Record<string, any>>
  admin_id: string
  admin_email: string
  ip_address: string | null
  user_agent: string | null
  created_at: Generated<Timestamp>
}

// Tabla de auditoría de control de acceso
export interface AuditoriaAccesoTable {
  id: Generated<string>
  empresa_id: string
  usuario_id: string | null
  accion: string // 'servicio_cerrado_activado', 'servicio_cerrado_desactivado', 'horario_acceso_modificado', 'acceso_bloqueado_servicio_cerrado', 'acceso_bloqueado_fuera_horario'
  detalles: JSONColumnType<Record<string, any>>
  ip_address: string | null
  user_agent: string | null
  created_at: Generated<Timestamp>
}

// Tabla de pagos de nómina
export interface NominaPagosTable {
  id: Generated<string>
  empresa_id: string
  nomina_id: string
  valor: number
  fecha: Generated<Timestamp>
  tipo: Generated<string>
  observaciones: string | null
  created_at: Generated<Timestamp>
}

// In SaaS, Roles usually belong to an Empresa OR are System Defaults.
// We will make roles belong to empresa for flexibility.
export interface RolesTable {
  id: Generated<string> 
  empresa_id: string
  nombre: string
  descripcion: string | null
  activo: Generated<boolean>
  es_superusuario: Generated<boolean>
  created_at: Generated<Timestamp>
}

export interface PermisosTable {
  id: Generated<number>
  nombre: string 
  clave: string // 'ver_comandas', etc
  descripcion: string | null
}

export interface PermisosRolTable {
  rol_id: string
  permiso_id: number
  empresa_id: string // Redundant but good for partitioning check
}

export interface SalonesTable {
  id: Generated<string> 
  empresa_id: string
  nombre: string
  activo: boolean
  created_at: Generated<Timestamp>
}

export interface MesasTable {
  id: Generated<string>
  empresa_id: string
  salon_id: string
  numero: string
  capacidad: number
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  tipo: string // 'rect', 'circle'
  activo: boolean
  ocupada: boolean
  created_at: Generated<Timestamp>
}

export interface CategoriasProductosTable {
  id: Generated<string>
  empresa_id: string
  nombre: string
  orden: number
  activo: boolean
}

export interface ProductosTable {
  id: Generated<string>
  empresa_id: string
  codigo: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  precio: number
  disponible: boolean
  tiene_personalizacion: boolean
  usa_inventario: boolean
  stock: number | null
  costo: number | null
  imagen_url: string | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
  // Columnas agregadas para compatibilidad con inventario avanzado
  usa_insumos: Generated<boolean>
  cantidad_inicial: Generated<number>
  cantidad_actual: Generated<number>
  personalizaciones_habilitadas: string | null
}

export interface InsumosTable {
  id: Generated<string>
  empresa_id: string
  codigo: string
  nombre: string
  unidad_medida: string
  stock_actual: number
  stock_minimo: number
  stock_critico: number
  costo_unitario: number | null
  categoria_id: string | null
  activo: Generated<boolean>
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface ProductoInsumosTable {
  id: Generated<string>
  empresa_id: string
  producto_id: string
  insumo_id: string
  cantidad: number
}

export interface ComandasTable {
  id: Generated<string>
  empresa_id: string
  usuario_id: string | null
  cliente_nombre: string | null // DatosCliente flattened or JSON? Let's use JSON for client data if complex
  datos_cliente: JSONColumnType<{ nombre?: string; direccion?: string; telefono?: string }> | null
  tipo_pedido: string // 'mesa', 'domicilio', 'llevar'
  estado: string
  subtotal: number
  total: number
  monto_pagado: number | null
  cambio: number | null
  metodo_pago: string | null
  observaciones: string | null
  fecha_apertura: Generated<Timestamp>
  fecha_cierre: Timestamp | null
}

export interface ComandaItemsTable {
  id: Generated<string>
  empresa_id: string
  comanda_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  total: number
  observaciones: string | null
  personalizacion: JSONColumnType<any> | null
}

export interface ComandaMesasTable {
  comanda_id: string
  mesa_id: string
  empresa_id: string
}

export interface FacturasTable {
  id: Generated<string>
  empresa_id: string
  comanda_id: string
  cliente_nombre: string
  cliente_rut: string
  monto_total: number
  fecha_emision: Generated<Timestamp>
  url_pdf: string | null
}

export interface ConfigFacturacionTable {
  id: Generated<string>
  empresa_id: string
  razon_social: string | null
  rut: string | null
  direccion: string | null
  giro: string | null
  telefono: string | null
  email: string | null
  logo_url: string | null
  activo: boolean | null
  nombre_empresa: string | null
  nit: string | null
  responsable_iva: boolean | null
  porcentaje_iva: number | null
  ubicacion_geografica: string | null
  telefonos: string[] | null // JSONB
  representante_legal: string | null
  tipo_identificacion: string | null
  departamento: string | null
  ciudad: string | null
  telefono2: string | null
  correo_electronico: string | null
  responsabilidad_tributaria: string | null
  tributos: string[] | null // JSONB
  zona: string | null
  sitio_web: string | null
  alias: string | null
  actividad_economica: string | null
  descripcion: string | null
  logo: string | null
  updated_at: Timestamp | null
}

export interface ProveedoresTable {
  id: Generated<string>
  empresa_id: string
  nombre: string
  rut: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  documento: string | null
  correo: string | null
  direccion: string | null
  descripcion: string | null
  pais: string | null
  departamento: string | null
  ciudad: string | null
  banco_nombre: string | null
  banco_tipo_cuenta: string | null
  banco_titular: string | null
  banco_nit_titular: string | null
  banco_numero_cuenta: string | null
  activo: Generated<boolean>
  updated_at: Generated<Timestamp>
}

export interface CategoriasPersonalizacionTable {
  id: Generated<string>
  empresa_id: string
  codigo: string
  nombre: string
  descripcion: string | null
  multi_seleccion: Generated<boolean>
  obligatorio: Generated<boolean>
  activo: Generated<boolean>
  orden: Generated<number>
}

export interface ItemsPersonalizacionTable {
  id: Generated<string>
  empresa_id: string
  codigo: string
  categoria_id: string
  nombre: string
  descripcion: string | null
  precio_extra: Generated<number>
  precio_adicional: Generated<number>
  activo: Generated<boolean>
  disponible: Generated<boolean>
  usa_inventario: Generated<boolean>
  usa_insumos: Generated<boolean>
  cantidad_actual: number | null
  cantidad_inicial: number | null
  cantidad_minima: number | null
  updated_at: Generated<Timestamp>
}

export interface InsumoCategoriasTable {
  id: Generated<string>
  empresa_id: string
  nombre: string
  descripcion: string | null
  orden: Generated<number>
  activo: Generated<boolean>
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface InsumoHistorialTable {
  id: Generated<string>
  empresa_id: string
  insumo_id: string
  cantidad: number
  unidad_medida: string
  producto_id: string | null
  comanda_id: string | null
  tipo_evento: string
  motivo: string | null
  usuario_id: string | null
  proveedor_id: string | null
  fecha_hora: Generated<Timestamp>
}

export interface PersonalizacionInsumosTable {
  item_personalizacion_id: string
  insumo_id: string
  empresa_id: string
  cantidad: number
}

export interface EmpleadosTable {
  id: Generated<string>
  empresa_id: string
  tipo_documento: string | null
  numero_documento: string | null
  nombres: string | null
  apellidos: string | null
  direccion: string | null
  municipio: string | null
  celular: string | null
  email: string | null
  cargo: string | null
  tipo_contrato: string | null
  fecha_inicio: Timestamp | null
  fecha_fin: Timestamp | null
  tipo_trabajador: string | null
  subtipo_trabajador: string | null
  alto_riesgo: boolean | null
  salario_integral: boolean | null
  frecuencia_pago: string | null
  salario_base: number | null
  auxilio_transporte: boolean | null
  metodo_pago: string | null
  banco: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  estado: string | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface NominasTable {
  id: Generated<string>
  empresa_id: string
  empleado_id: string
  fecha: Timestamp
  mes: number
  anio: number
  monto_total: number
  estado: string
}

export interface NominaDetallesTable {
  id: Generated<string>
  empresa_id: string
  nomina_id: string
  tipo: string // 'bono', 'descuento', 'sueldo_base'
  descripcion: string
  monto: number
}

export interface ContratosTable {
  id: Generated<string>
  empresa_id: string
  empleado_id: string
  tipo_contrato: string
  fecha_inicio: Timestamp
  fecha_fin: Timestamp | null
  duracion_contrato: string | null
  cargo: string | null
  salario: number | null
  file_name: string | null
  file_path: string | null
  contrato_details: JSONColumnType<any>
  contrato_template: string | null
  usuario_id: string | null
  usuario_nombre: string | null
  created_at: Generated<Timestamp>
}

export interface PlantillasContratoTable {
  id: Generated<string>
  empresa_id: string
  nombre: string
  contenido: string
  es_default: Generated<boolean>
  created_at: Generated<Timestamp>
  updated_at: Timestamp
}

export interface ConfigSistemaTable {
  id: Generated<string>
  empresa_id: string
  clave: string
  valor: JSONColumnType<any>
}

export interface ConfiguracionNominaTable {
  id: Generated<number>
  empresa_id: string
  anio: number
  salario_minimo: number
  auxilio_transporte: number
  uvt: number
  porc_salud_empleado: number
  porc_pension_empleado: number
  fondo_solidaridad_limite: number
  porc_salud_employer: number
  porc_pension_employer: number
  porc_caja_comp: number
  porc_sena: number
  porc_icbf: number
  porc_cesantias: number
  porc_intereses_cesantias: number
  porc_prima: number
  porc_vacaciones: number
  porc_recargo_dominical: number
  porc_recargo_festivo: number
  porc_recargo_diurno: number
  porc_extra_diurna_dominical: number
  horas_mensuales: number
  vigente: boolean
  created_at: Generated<Timestamp>
}

export interface HistorialInventarioTable {
  id: Generated<string>
  empresa_id: string
  insumo_id: string | null
  producto_id: string | null
  tipo_movimiento: string // 'consumo', 'ajuste', 'compra', 'devolucion'
  cantidad: number
  motivo: string | null
  usuario_id: string | null
  fecha: Generated<Timestamp>
}
