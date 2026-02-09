
export interface Mesa {
  id: string;
  numero: string;
  capacidad: number;
  salon: string;
  salon_id?: string;
  ocupada: boolean;
}

export interface Salon {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  codigo?: string;
  nombre: string;
  precio: number;
  categoria: string; // Cambiado de CategoriaProducto a string para permitir categorías dinámicas
  disponible: boolean;
  descripcion?: string;
  tiene_personalizacion?: boolean;
  personalizaciones_habilitadas?: string[]; // Array de nombres de categorías de personalización
  usa_inventario?: boolean;
  usa_insumos?: boolean;
  cantidad_inicial?: number | null;
  cantidad_actual?: number | null;
}

export interface Insumo {
  id: string;
  codigo?: string;
  nombre: string;
  unidad_medida: 'g' | 'kg' | 'ml' | 'unidad' | string;
  stock_actual: number;
  stock_minimo: number;
  stock_critico: number;
  costo_unitario?: number | null;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
  activo?: boolean;
  estado?: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' | null;
  created_at?: string;
  updated_at?: string;
}

export interface InsumoCategoria {
  id: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RecetaProductoInsumo {
  producto_id: string;
  insumo_id: string;
  cantidad_usada: number;
  insumo_nombre?: string;
  unidad_medida?: string;
}

export interface AjustePersonalizacionInsumo {
  item_personalizacion_id: string;
  insumo_id: string;
  cantidad_ajuste: number;
  insumo_nombre?: string;
  unidad_medida?: string;
}

export interface ConfiguracionSistema {
  id?: string;
  inventario_avanzado: boolean;
  critico_modo?: 'CRITICO' | 'BAJO' | 'NUNCA';
  created_at?: string;
  updated_at?: string;
}

export interface InsumoHistorial {
  id: string;
  fecha_hora: string;
  insumo_id: string;
  insumo_nombre?: string;
  cantidad: number;
  unidad_medida: string;
  producto_id?: string | null;
  producto_nombre?: string | null;
  comanda_id?: string | null;
  tipo_evento: string;
  motivo?: string | null;
  usuario_id?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
}

export interface Proveedor {
  id: string;
  nombre: string;
  documento?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;  descripcion?: string;  pais?: string;
  departamento?: string;
  ciudad?: string;
  banco_nombre?: string;
  banco_tipo_cuenta?: string;
  banco_titular?: string;
  banco_nit_titular?: string;
  banco_numero_cuenta?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CategoriaProducto = 
  | 'desayuno'
  | 'almuerzo'
  | 'almuerzo_especial'
  | 'carta_pechuga'
  | 'carta_carne'
  | 'carta_pasta'
  | 'carta_pescado'
  | 'carta_arroz'
  | 'sopa'
  | 'bebida'
  | 'otros'
  | 'cafeteria'
  | 'porciones';

export interface ItemComanda {
  id: string;
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string;
  personalizacion?: PersonalizacionItem;
  personalizacion_pendiente?: boolean; // Indica que el producto requiere personalización pero aún no se ha configurado
}

export interface ItemPersonalizacion {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion?: string;
  precio_adicional: number;
  activo: boolean;
  disponible?: string | boolean;
  usa_inventario?: boolean | string;
  usa_insumos?: boolean | string;
  cantidad_inicial?: number | null;
  cantidad_actual?: number | null;
}

export interface PersonalizacionItem {
  // Sistema dinámico de personalizaciones
  // Las propiedades se crean dinámicamente según las categorías configuradas
  precio_adicional?: number;
  [key: string]: any; // Permite cualquier categoría de personalización
}

export interface CategoriaPersonalizacion {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
}

export interface PasoComanda {
  paso: number;
  titulo: string;
  completado: boolean;
}

export interface DatosCliente {
  nombre: string;
  direccion: string;
  telefono?: string;
  es_para_llevar: boolean; // true = cliente recoge, false = domicilio
}

export interface FormularioComanda {
  mesas: Mesa[];
  items: ItemComanda[];
  tipo_pedido?: 'mesa' | 'domicilio' | 'llevar';
  tipo_servicio?: string;
  datos_cliente?: DatosCliente;
  observaciones_generales?: string;
}

export interface Comanda {
  id: string;
  mesas: Mesa[];
  items: ItemComanda[];
  subtotal: number;
  total: number;
  estado: EstadoComanda;
  observaciones_generales?: string;
  mesero?: string;
  usuario_nombre?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  fecha_apertura?: string;
  datos_cliente?: DatosCliente;
  tipo_pedido?: 'mesa' | 'llevar' | 'domicilio';
}

export interface ComandaHistorial {
  id: string;
  mesas: string;
  items_resumen: string;
  items?: any[];
  total: number;
  subtotal?: number;
  estado: string;
  mesero: string;
  usuario_nombre?: string;
  fecha: string;
  fecha_creacion?: string;
  tipo_pedido: string;
  cliente_nombre?: string;
  datos_cliente?: DatosCliente;
  metodo_pago?: string;
  monto_pagado?: number;
  cambio?: number;
  observaciones_generales?: string;
}

export type EstadoComanda = 'pendiente' | 'preparando' | 'lista' | 'entregada' | 'pagada' | 'cancelada' | 'facturada' | 'abierta' | 'en_preparacion';

export interface Factura {
  id: string;
  numero_factura: string;
  comanda_id: string;
  subtotal: number;
  impuestos: number;
  propina: number;
  total: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  cliente_nombre?: string;
  cliente_documento?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  fecha_emision: string;
}

export interface MetodoPagoReporte {
  metodo: string;
  total: number;
  cantidad: number;
  porcentaje: number;
  comision_estimada?: number;
}

export interface ProductoVendido {
  producto: {
    id: string;
    nombre: string;
    categoria?: string;
  };
  cantidad_vendida: number;
  total_vendido: number;
}

export interface VentaPorHora {
  hora: number;
  ventas: number;
  comandas: number;
  es_pico?: boolean;
  es_muerta?: boolean;
}

export interface ComparativaVentas {
  ventas: number;
  ventas_porcentaje: number;
  comandas: number;
  comandas_porcentaje: number;
}

export interface ReporteVentas {
  fecha: string;
  total_ventas: number;
  cantidad_comandas: number;
  promedio_por_comanda: number;
  metodos_pago: MetodoPagoReporte[];
  productos_mas_vendidos: ProductoVendido[];
  ventas_por_hora: VentaPorHora[];
  comparativas?: {
    vs_dia_anterior: ComparativaVentas;
    vs_semana_anterior: ComparativaVentas;
    vs_promedio_semanal: ComparativaVentas;
  };
  alertas?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface Empleado {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  direccion?: string;
  municipio?: string;
  celular?: string;
  email?: string;
  cargo: string;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_fin?: string;
  tipo_trabajador: string;
  subtipo_trabajador?: string;
  alto_riesgo: boolean;
  salario_integral: boolean;
  frecuencia_pago: string;
  salario_base: number;
  auxilio_transporte: boolean;
  metodo_pago: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  es_periodo_prueba?: boolean;
  fecha_fin_periodo_prueba?: string;
}

export interface ConfiguracionNomina {
  id?: number;
  empresa_id?: string;
  anio?: number;
  salario_minimo: number;
  auxilio_transporte: number;
  uvt: number;
  horas_mensuales: number;
  // Porcentajes empleado
  porc_salud_empleado: number;
  porc_pension_empleado: number;
  fondo_solidaridad_limite?: number;
  // Porcentajes empleador
  porc_salud_empleador: number;
  porc_pension_empleador: number;
  porc_caja_comp: number;
  porc_sena: number;
  porc_icbf: number;
  // Prestaciones
  porc_cesantias?: number;
  porc_intereses_cesantias?: number;
  porc_prima?: number;
  porc_vacaciones?: number;
  // Recargos
  porc_recargo_dominical: number;
  porc_recargo_festivo: number;
  porc_recargo_diurno: number;
  porc_extra_diurna_dominical: number;
  vigente?: boolean;
}

export interface NominaDetalle {
  id?: string;
  empleado_id: string;
  periodo_mes: string;
  periodo_anio: number;
  dias_trabajados: number;
  sueldo_basico: number;
  auxilio_transporte: number;
  // Horas extras
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  horas_diurnas?: number;
  horas_dominicales_diurnas?: number;
  horas_festivas_diurnas?: number;
  horas_extra_diurna_dominical?: number;
  // Valores calculados
  valor_diurnas?: number;
  valor_dominicales_diurnas?: number;
  valor_festivas_diurnas?: number;
  valor_extra_diurna_dominical?: number;
  recargo_nocturno: number;
  comisiones?: number;
  otros_devengados?: number;
  total_devengado: number;
  // Deducciones
  salud: number;
  salud_empleado?: number;
  pension: number;
  pension_empleado?: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  otras_deducciones: number;
  total_deducciones: number;
  neto_pagado: number;
  // Metadata
  fecha_generacion?: string;
  estado?: string;
  version?: number;
  empleado_nombre?: string;
  empleado_documento?: string;
  usuario_nombre?: string;
  pagos_registrados?: PagoNomina[];
  pdf_path?: string;
  pdf_version?: number;
}

export interface Liquidacion {
  id?: number;
  empleado_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo_retiro: string;
  dias_laborados: number;
  cesantias: number;
  intereses_cesantias: number;
  prima_servicios: number;
  vacaciones: number;
  total_liquidacion: number;
  fecha_liquidacion?: string;
  usuario_genero?: string;
  version_normativa?: string;
  empleado?: Empleado;
}

export interface ConfiguracionFacturacion {
  id?: number;
  nombre_empresa: string;
  nit: string;
  responsable_iva: boolean;
  porcentaje_iva: number | null;
  direccion: string;
  ubicacion_geografica: string;
  telefonos: string[];
  
  // Nuevos campos extendidos
  representante_legal?: string;
  tipo_identificacion?: string;
  departamento?: string;
  ciudad?: string;
  telefono2?: string;
  correo_electronico?: string;
  responsabilidad_tributaria?: string;
  tributos?: string[];
  zona?: string;
  sitio_web?: string;
  alias?: string;
  actividad_economica?: string;
  descripcion?: string;
  logo?: string;

  created_at?: string;
  updated_at?: string;
}

export interface PagoNomina {
  id?: number;
  nomina_detalle_id: string;
  empleado_id: string;
  periodo_mes: string;
  periodo_anio: number;
  fecha: string;
  tipo: 'QUINCENA' | 'AJUSTE' | 'COMPLEMENTO';
  valor: number;
  usuario_nombre?: string;
  observaciones?: string;
}

export interface HistorialNomina {
  id: number;
  nomina_detalle_id?: string;
  periodo_mes: string;
  periodo_anio: number;
  total_empleados?: number;
  total_pagado?: number;
  fecha_generacion?: string;
  fecha?: string;
  version?: number;
  cambio_realizado?: string;
  usuario?: string;
}

export interface ContratoDetails {
  TIPO_CONTRATO: string;
  DURACION_CONTRATO: string;
  FECHA_INICIO: string;
  FECHA_FIN: string;
  PERIODO_PRUEBA: string;
  DIAS_LABORADOS: string;
  HORARIO_TRABAJO: string;
  FORMA_PAGO: string;
  PERIODO_PAGO: string;
  FECHAS_PAGO: string;
  LUGAR_FIRMA: string;
  FECHA_FIRMA: string;
}

export interface GenerarContratoResponse {
  success: boolean;
  message: string;
  url: string;
  file_name: string;
}

export interface VariableContrato {
  variable: string;
  descripcion: string;
}

export interface VariablesDisponibles {
  empresa: VariableContrato[];
  empleado: VariableContrato[];
  contrato: VariableContrato[];
}

export interface PlantillaDefaultResponse {
  plantilla: string;
  variables: VariablesDisponibles;
  origen: 'empresa' | 'archivo';
  plantillaId: string | null;
  nombrePlantilla: string | null;
}

export interface PlantillaContrato {
  id: string;
  empresa_id: string;
  nombre: string;
  contenido: string;
  es_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContratoHistorico {
  id: string;
  empleado_id: string;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_fin?: string;
  duracion_contrato?: string;
  cargo?: string;
  salario?: number;
  file_name: string;
  file_path: string;
  contrato_details: ContratoDetails;
  contrato_template?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  created_at: string;
}

export interface LoginRequest {
  empresaEmail: string;  // Email del administrador de la empresa (identifica el tenant)
  usuarioEmail: string;  // Email del empleado que quiere ingresar
  password: string;      // Contraseña del empleado
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioSesion;
  permisos: string[];
}

export interface UsuarioSesion {
  id: string;
  nombre_completo: string;
  usuario: string;
  email: string;
  rol_nombre: string;
  empresa_id: string;
  es_superusuario?: boolean;
}

export interface Usuario {
  id: string;
  usuario: string;
  email?: string;
  nombre_completo: string;
  rol_id: string;
  pin?: string;
  telefono?: string;
  activo: boolean;
  ultimo_login?: string;
  created_at?: string;
  updated_at?: string;
  rol_nombre?: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  es_superusuario?: boolean;
  activo?: boolean;
  created_at?: string;
  cantidad_usuarios?: number;
  permisos?: { permiso: string; nombre?: string }[];
}
