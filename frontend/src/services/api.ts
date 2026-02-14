import axios from 'axios';
import { 
  Comanda, Mesa, Producto, Factura, EstadoComanda, ReporteVentas, ItemComanda, 
  ComandaHistorial, PaginatedResponse, Empleado, ConfiguracionNomina, 
  NominaDetalle, Liquidacion, ConfiguracionFacturacion, PagoNomina, 
  HistorialNomina, ContratoDetails, GenerarContratoResponse, ContratoHistorico, PlantillaDefaultResponse, PlantillaContrato,
  Insumo, RecetaProductoInsumo, RecetaProductoResumen, AjustePersonalizacionInsumo, ConfiguracionSistema, InsumoHistorial,
  Proveedor, InsumoCategoria
} from '@/types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Aumentado temporalmente para debug
});

// Interceptor para agregar el token de autenticación a cada solicitud
api.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage solo en el cliente
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores de conexión y expiración de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ===== MANEJO DE TOKEN EXPIRADO =====
    // Si el backend responde 401 con código TOKEN_EXPIRED:
    // Limpiar sesión completa y redirigir a login
    if (
      error.response?.status === 401 &&
      (error.response?.data?.code === 'TOKEN_EXPIRED' || error.response?.data?.codigo === 'TOKEN_EXPIRED') &&
      !originalRequest._tokenExpiredHandled
    ) {
      originalRequest._tokenExpiredHandled = true;

      if (typeof window !== 'undefined') {
        // Limpiar toda la sesión
        localStorage.removeItem('token');
        localStorage.removeItem('impersonation_active');
        localStorage.removeItem('impersonation_data');
        
        // Despachar evento para que AuthContext se actualice
        window.dispatchEvent(new CustomEvent('session-expired', {
          detail: { message: 'Tu sesión expiró por seguridad. Inicia sesión nuevamente.' }
        }));

        // Redirigir a login (forzar recarga para limpiar estado React)
        window.location.href = '/';
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // Mesas
  async getMesas(): Promise<Mesa[]> {
    const response = await api.get('/mesas');
    return response.data;
  },

  async createMesa(mesa: { numero: string; capacidad: number; salon_id?: string }): Promise<Mesa> {
    const response = await api.post('/mesas', mesa);
    return response.data;
  },

  async updateMesa(id: string, mesa: { numero: string; capacidad: number; salon_id?: string }): Promise<Mesa> {
    const response = await api.put(`/mesas/${id}`, mesa);
    return response.data;
  },

  async deleteMesa(id: string): Promise<void> {
    await api.delete(`/mesas/${id}`);
  },

  async updateMesaEstado(mesaId: string, ocupada: boolean): Promise<Mesa> {
    const response = await api.patch(`/mesas/${mesaId}`, { ocupada });
    return response.data;
  },

  async liberarMesa(mesaId: string): Promise<Mesa> {
    const response = await api.patch(`/mesas/${mesaId}/liberar`);
    return response.data;
  },

  // Salones
  async getSalones(): Promise<any[]> {
    const response = await api.get('/salones');
    return response.data;
  },

  async createSalon(salon: { nombre: string; descripcion?: string }): Promise<any> {
    const response = await api.post('/salones', salon);
    return response.data;
  },

  async updateSalon(id: string, salon: { nombre: string; descripcion?: string; activo: boolean }): Promise<any> {
    const response = await api.put(`/salones/${id}`, salon);
    return response.data;
  },

  async deleteSalon(id: string): Promise<void> {
    await api.delete(`/salones/${id}`);
  },

  async getMesasBySalon(salonId: string): Promise<Mesa[]> {
    const response = await api.get(`/salones/${salonId}/mesas`);
    return response.data;
  },

  // Categorías de Productos
  async getCategoriasProductos(): Promise<any[]> {
    const response = await api.get('/categorias');
    return response.data;
  },

  async getCategoriasProductosActivas(): Promise<any[]> {
    const response = await api.get('/categorias/activas');
    return response.data;
  },

  async createCategoriaProducto(categoria: { nombre: string; descripcion?: string }): Promise<any> {
    const response = await api.post('/categorias', categoria);
    return response.data;
  },

  async updateCategoriaProducto(id: string, categoria: { nombre: string; descripcion?: string; activo?: boolean }): Promise<any> {
    const response = await api.put(`/categorias/${id}`, categoria);
    return response.data;
  },

  async deleteCategoriaProducto(id: string): Promise<void> {
    await api.delete(`/categorias/${id}`);
  },

  async getConteoProductosCategoria(id: string): Promise<{ count: number }> {
    const response = await api.get(`/categorias/${id}/productos/count`);
    return response.data;
  },

  // Productos
  async getProductos(): Promise<Producto[]> {
    const response = await api.get('/productos');
    return response.data;
  },

  async getAllProductos(): Promise<Producto[]> {
    const response = await api.get('/productos/all');
    return response.data;
  },

  async getProductosByCategoria(categoria: string): Promise<Producto[]> {
    const response = await api.get(`/productos/categoria/${categoria}`);
    return response.data;
  },

  async getCategorias(): Promise<string[]> {
    const response = await api.get('/productos/categorias');
    return response.data;
  },

  async createProducto(producto: Partial<Producto>): Promise<Producto> {
    const response = await api.post('/productos', producto);
    return response.data;
  },

  async updateProducto(id: string, producto: Partial<Producto>): Promise<Producto> {
    const response = await api.put(`/productos/${id}`, producto);
    return response.data;
  },

  async deleteProducto(id: string): Promise<void> {
    await api.delete(`/productos/${id}`);
  },

  // Configuración de Sistema
  async getConfiguracionSistema(): Promise<ConfiguracionSistema> {
    const response = await api.get('/configuracion/sistema');
    return response.data;
  },

  async updateConfiguracionSistema(config: ConfiguracionSistema): Promise<ConfiguracionSistema> {
    const response = await api.put('/configuracion/sistema', config);
    return response.data;
  },

  // Límites de Licencia
  async getLimitesLicencia(): Promise<{
    max_usuarios: number;
    max_mesas: number;
    plan: string;
    estado: string;
    usuarios_actuales: number;
    mesas_actuales: number;
    puede_crear_usuarios: boolean;
    puede_crear_mesas: boolean;
  }> {
    const response = await api.get('/sistema/limites-licencia');
    return response.data;
  },

  // Inventario Avanzado - Insumos
  async getInsumos(): Promise<Insumo[]> {
    const response = await api.get('/inventario-avanzado/insumos');
    return response.data;
  },

  async createInsumo(insumo: Partial<Insumo>): Promise<Insumo> {
    const response = await api.post('/inventario-avanzado/insumos', insumo);
    return response.data;
  },

  async updateInsumo(id: string, insumo: Partial<Insumo>): Promise<Insumo> {
    const response = await api.put(`/inventario-avanzado/insumos/${id}`, insumo);
    return response.data;
  },

  async deleteInsumo(id: string): Promise<void> {
    await api.delete(`/inventario-avanzado/insumos/${id}`);
  },

  async ajustarInsumo(id: string, data: { cantidad: number; motivo?: string; proveedor_id?: string }): Promise<Insumo> {
    const response = await api.post(`/inventario-avanzado/insumos/${id}/ajuste`, data);
    return response.data;
  },

  // Proveedores
  async getProveedores(): Promise<Proveedor[]> {
    const response = await api.get('/proveedores');
    return response.data;
  },

  async createProveedor(proveedor: Partial<Proveedor>): Promise<any> {
    const response = await api.post('/proveedores', proveedor);
    return response.data;
  },

  async updateProveedor(id: string, proveedor: Partial<Proveedor>): Promise<any> {
    const response = await api.put(`/proveedores/${id}`, proveedor);
    return response.data;
  },

  async deleteProveedor(id: string): Promise<void> {
    await api.delete(`/proveedores/${id}`);
  },

  async getInsumoHistorial(insumoId?: string, limit?: number, fechaInicio?: string, fechaFin?: string): Promise<InsumoHistorial[]> {
    const params: any = {};
    if (insumoId) params.insumo_id = insumoId;
    if (limit) params.limit = limit;
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    const response = await api.get('/inventario-avanzado/insumos/historial', { params });
    return response.data;
  },

  async getRiesgoProductos(): Promise<{ producto_id: string; estado: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' }[]> {
    const response = await api.get('/inventario-avanzado/riesgo/productos');
    return response.data;
  },

  async getRiesgoPersonalizaciones(): Promise<{ item_personalizacion_id: string; estado: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' }[]> {
    const response = await api.get('/inventario-avanzado/riesgo/personalizaciones');
    return response.data;
  },

  // Inventario Avanzado - Recetas
  async getRecetaProducto(productoId: string): Promise<RecetaProductoInsumo[]> {
    const response = await api.get(`/inventario-avanzado/recetas/productos/${productoId}`);
    return response.data;
  },

  async getResumenRecetasProductos(): Promise<RecetaProductoResumen[]> {
    const response = await api.get('/inventario-avanzado/recetas/productos/resumen');
    return response.data;
  },

  async updateRecetaProducto(productoId: string, items: RecetaProductoInsumo[]): Promise<any> {
    const response = await api.put(`/inventario-avanzado/recetas/productos/${productoId}`, { items });
    return response.data;
  },

  async getAjustesPersonalizacion(itemId: string): Promise<AjustePersonalizacionInsumo[]> {
    const response = await api.get(`/inventario-avanzado/recetas/personalizaciones/${itemId}`);
    return response.data;
  },

  async updateAjustesPersonalizacion(itemId: string, items: AjustePersonalizacionInsumo[]): Promise<any> {
    const response = await api.put(`/inventario-avanzado/recetas/personalizaciones/${itemId}`, { items });
    return response.data;
  },

  async exportarInsumos(): Promise<Blob> {
    const response = await api.get('/inventario-avanzado/insumos/export', { responseType: 'blob' });
    return response.data;
  },

  async importarInsumos(fileBase64: string): Promise<any> {
    const response = await api.post('/inventario-avanzado/insumos/import', { fileBase64 });
    return response.data;
  },

  async exportarRecetas(): Promise<Blob> {
    const response = await api.get('/inventario-avanzado/recetas/export', { responseType: 'blob' });
    return response.data;
  },

  async importarRecetas(fileBase64: string): Promise<any> {
    const response = await api.post('/inventario-avanzado/recetas/import', { fileBase64 });
    return response.data;
  },

  async exportarProductosExcel(): Promise<Blob> {
    const response = await api.get('/inventario-avanzado/productos/export', { responseType: 'blob' });
    return response.data;
  },

  async importarProductosExcel(fileBase64: string): Promise<any> {
    const response = await api.post('/inventario-avanzado/productos/import', { fileBase64 });
    return response.data;
  },

  async exportarPersonalizaciones(): Promise<Blob> {
    const response = await api.get('/personalizaciones/export', { responseType: 'blob' });
    return response.data;
  },

  async importarPersonalizaciones(fileBase64: string): Promise<any> {
    const response = await api.post('/personalizaciones/import', { fileBase64 });
    return response.data;
  },

  // Categorías de Insumos
  async getInsumoCategorias(): Promise<InsumoCategoria[]> {
    const response = await api.get('/insumo-categorias');
    return response.data;
  },

  async createInsumoCategoria(categoria: Partial<InsumoCategoria>): Promise<InsumoCategoria> {
    const response = await api.post('/insumo-categorias', categoria);
    return response.data;
  },

  async updateInsumoCategoria(id: string, categoria: Partial<InsumoCategoria>): Promise<InsumoCategoria> {
    const response = await api.put(`/insumo-categorias/${id}`, categoria);
    return response.data;
  },

  async deleteInsumoCategoria(id: string): Promise<void> {
    await api.delete(`/insumo-categorias/${id}`);
  },

  // Limpieza de historial
  async limpiarHistorialInsumos(dias: number): Promise<{ message: string, deletedCount: number }> {
    const response = await api.delete(`/inventario-avanzado/historial/limpiar`, { data: { dias } });
    return response.data;
  },

  // Comandas
  async createComanda(comanda: Partial<Comanda>): Promise<Comanda> {
    const response = await api.post('/comandas', comanda);
    return response.data;
  },

  async getComandas(): Promise<Comanda[]> {
    const response = await api.get('/comandas');
    return response.data;
  },

  async getComandasActivas(): Promise<Comanda[]> {
    const response = await api.get('/comandas/activas');
    return response.data;
  },

  async getComandasByMesa(mesaId: string): Promise<Comanda[]> {
    const response = await api.get(`/comandas/mesa/${mesaId}`);
    return response.data;
  },

  async actualizarEstadoComanda(comandaId: string, estado: EstadoComanda): Promise<Comanda> {
    const response = await api.patch(`/comandas/${comandaId}/estado`, { estado });
    return response.data;
  },

  async deleteComanda(comandaId: string): Promise<void> {
    await api.delete(`/comandas/${comandaId}`);
  },
  async editarComanda(comandaId: string, items: ItemComanda[], observaciones_generales?: string, imprimir_adicionales?: boolean, imprimir_completa?: boolean): Promise<any> {
    const response = await api.put(`/comandas/${comandaId}`, {
      items,
      observaciones_generales,
      imprimir: imprimir_adicionales,
      imprimirCompleta: imprimir_completa
    });
    return response.data;
  },

  async cambiarMesaComanda(comandaId: string, nuevas_mesas: Mesa[]): Promise<any> {
    const response = await api.patch(`/comandas/${comandaId}/cambiar-mesa`, {
      nuevas_mesas
    });
    return response.data;
  },

  async combinarComandas(targetId: string, origenId: string): Promise<any> {
    const response = await api.patch(`/comandas/${targetId}/combinar`, { 
      origen_id: origenId 
    });
    return response.data;
  },

  async getHistorialComandas(fecha?: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<ComandaHistorial>> {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/comandas/historial?${params.toString()}`);
    return response.data;
  },

  // Facturas
  async crearFactura(factura: Partial<Factura>): Promise<Factura> {
    const response = await api.post('/facturas', factura);
    return response.data;
  },

  async getFacturas(): Promise<Factura[]> {
    const response = await api.get('/facturas');
    return response.data;
  },

  // Reportes
  async getReporteVentas(fecha?: string): Promise<ReporteVentas> {
    const params = fecha ? { fecha } : {};
    const response = await api.get('/reportes/ventas', { params });
    return response.data;
  },

  async getReporteVentasPorRango(fechaInicio: string, fechaFin: string): Promise<ReporteVentas[]> {
    const response = await api.get('/reportes/ventas/rango', {
      params: { fechaInicio, fechaFin }
    });
    return response.data;
  },

  // Categorías de Personalización
  async getCategoriasPersonalizacion(): Promise<any[]> {
    const response = await api.get('/personalizaciones/categorias');
    return response.data;
  },

  async createCategoriaPersonalizacion(categoria: any): Promise<any> {
    const response = await api.post('/personalizaciones/categorias', categoria);
    return response.data;
  },

  async updateCategoriaPersonalizacion(id: string, categoria: any): Promise<any> {
    const response = await api.put(`/personalizaciones/categorias/${id}`, categoria);
    return response.data;
  },

  async deleteCategoriaPersonalizacion(id: string): Promise<void> {
    await api.delete(`/personalizaciones/categorias/${id}`);
  },

  // Items de personalización genéricos (funciona con cualquier categoría)
  async getItemsPersonalizacion(categoriaId: string): Promise<any[]> {
    const response = await api.get(`/personalizaciones/categorias/${categoriaId}/items`);
    return response.data;
  },

  async createItemPersonalizacion(categoriaId: string, item: any): Promise<any> {
    const response = await api.post(`/personalizaciones/categorias/${categoriaId}/items`, item);
    return response.data;
  },

  async updateItemPersonalizacion(categoriaId: string, itemId: string, item: any): Promise<any> {
    const response = await api.put(`/personalizaciones/categorias/${categoriaId}/items/${itemId}`, item);
    return response.data;
  },

  async deleteItemPersonalizacion(categoriaId: string, itemId: string): Promise<void> {
    await api.delete(`/personalizaciones/categorias/${categoriaId}/items/${itemId}`);
  },

  async updateDisponibilidadItem(categoriaId: string, itemId: string, disponible: boolean): Promise<any> {
    const response = await api.patch(`/personalizaciones/categorias/${categoriaId}/items/${itemId}/disponibilidad`, { disponible });
    return response.data;
  },

  // Configuración de Facturación
  async getConfiguracionFacturacion(): Promise<any> {
    const response = await api.get('/configuracion/facturacion');
    return response.data;
  },

  async updateConfiguracionFacturacion(config: {
    nombre_empresa: string;
    nit: string;
    responsable_iva: boolean;
    porcentaje_iva: number | null;
    direccion: string;
    ubicacion_geografica: string;
    telefonos: string[];
  }): Promise<any> {
    const response = await api.put('/configuracion/facturacion', config);
    return response.data;
  },

  // ==================== EMPLEADOS ====================
  async getEmpleados(): Promise<Empleado[]> {
    const response = await api.get('/empleados');
    return response.data;
  },

  async getEmpleadosActivos(): Promise<Empleado[]> {
    const response = await api.get('/empleados/activos');
    return response.data;
  },

  async createEmpleado(empleado: Partial<Empleado>): Promise<Empleado> {
    const response = await api.post('/empleados', empleado);
    return response.data;
  },

  async updateEmpleado(id: string, empleado: Partial<Empleado>): Promise<Empleado> {
    const response = await api.put(`/empleados/${id}`, empleado);
    return response.data;
  },

  async deleteEmpleado(id: string): Promise<void> {
    await api.delete(`/empleados/${id}`);
  },

  // Recursos Humanos - Contratos
  async generarContrato(empleado_id: string, contrato_details: ContratoDetails, contrato_template?: string): Promise<GenerarContratoResponse> {
    const response = await api.post('/contratos/generar', { empleado_id, contrato_details, contrato_template });
    return response.data;
  },

  async getPlantillaDefault(): Promise<PlantillaDefaultResponse> {
    const response = await api.get('/contratos/plantilla-default');
    return response.data;
  },

  async getContratosHistorial(empleado_id: string): Promise<ContratoHistorico[]> {
    const response = await api.get(`/contratos/historial/${empleado_id}`);
    return response.data;
  },

  async deleteContrato(id: string): Promise<void> {
    await api.delete(`/contratos/${id}`);
  },

  // Recursos Humanos - Plantillas de Contrato (Multi-tenant)
  async getPlantillas(): Promise<PlantillaContrato[]> {
    const response = await api.get('/contratos/plantillas');
    return response.data;
  },

  async crearPlantilla(nombre: string, contenido: string, es_default?: boolean): Promise<{ success: boolean; plantilla: PlantillaContrato }> {
    const response = await api.post('/contratos/plantillas', { nombre, contenido, es_default });
    return response.data;
  },

  async actualizarPlantilla(id: string, datos: { nombre?: string; contenido?: string }): Promise<{ success: boolean; plantilla: PlantillaContrato }> {
    const response = await api.put(`/contratos/plantillas/${id}`, datos);
    return response.data;
  },

  async eliminarPlantilla(id: string): Promise<void> {
    await api.delete(`/contratos/plantillas/${id}`);
  },

  async setPlantillaDefault(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/contratos/plantillas/${id}/set-default`);
    return response.data;
  },

  // ==================== CONFIGURACIÓN NÓMINA ====================
  async getConfiguracionNomina(): Promise<ConfiguracionNomina> {
    const response = await api.get('/nomina/configuracion');
    return response.data;
  },
  
    // ==================== IMPRESIÓN REMOTA (AGENTE) ====================
    async createRemotePairingToken(data?: { alias?: string; ttlMinutes?: number }): Promise<{ activationCode: string; expiresAt: string }> {
      const response = await api.post('/print/pairing-token', data || {});
      return response.data;
    },
  
    async listRemotePrinters(): Promise<any[]> {
      const response = await api.get('/print/printers');
      return response.data?.printers || [];
    },
  
    async listRemotePrintJobs(params?: { printerId?: string; status?: string; limit?: number }): Promise<any[]> {
      const qs = new URLSearchParams();
      if (params?.printerId) qs.append('printerId', params.printerId);
      if (params?.status) qs.append('status', params.status);
      if (params?.limit) qs.append('limit', String(params.limit));
      const response = await api.get(`/print/jobs${qs.toString() ? `?${qs.toString()}` : ''}`);
      return response.data?.jobs || [];
    },

    async deleteRemotePrinter(printerId: string): Promise<void> {
      await api.delete(`/print/printers/${printerId}`);
    },

    async updateRemotePrinterConfig(printerId: string, config: { paperWidth?: '58mm' | '80mm'; fontSize?: 'small' | 'normal' | 'large' }): Promise<void> {
      await api.patch(`/print/printers/${printerId}/config`, config);
    },

    async createRemoteTestPrint(printerId: string, payload: any): Promise<void> {
      await api.post('/print/jobs', {
        printerId,
        externalId: `test:${Date.now()}`,
        type: 'kitchen_ticket',
        payload
      });
    },

  async updateConfiguracionNomina(config: Partial<ConfiguracionNomina>): Promise<ConfiguracionNomina> {
    const response = await api.put('/nomina/configuracion', config);
    return response.data;
  },

  // ==================== CÁLCULO Y GESTIÓN DE NÓMINA ====================
  async calcularNomina(
    empleadoId: string,
    diasTrabajados: number,
    extraData?: {
      horas_diurnas?: number;
      horas_dominicales_diurnas?: number;
      horas_festivas_diurnas?: number;
      horas_extra_diurna_dominical?: number;
      comisiones?: number;
      otras_deducciones?: number;
      periodo_mes?: string;
      periodo_anio?: number;
      usuario_nombre?: string;
    }
  ): Promise<NominaDetalle> {
    const response = await api.post('/nomina/calcular', {
      empleado_id: empleadoId,
      dias_trabajados: diasTrabajados,
      ...extraData
    });
    return response.data;
  },

  async guardarNominaDetalle(data: {
    empleado_id: string;
    dias_trabajados: number;
    horas_diurnas?: number;
    horas_dominicales_diurnas?: number;
    horas_festivas_diurnas?: number;
    horas_extra_diurna_dominical?: number;
    comisiones?: number;
    otras_deducciones?: number;
    periodo_mes?: string;
    periodo_anio?: number;
    usuario_nombre?: string;
  }): Promise<{ detalle: NominaDetalle; pagos: PagoNomina[]; saldo_pendiente: number; info: string }> {
    const response = await api.post('/nomina/detalle/guardar', data);
    return response.data;
  },

  async getHistorialNomina(
    empleadoId: string,
    filtros?: { periodo_mes?: string; periodo_anio?: number }
  ): Promise<{ nominas: NominaDetalle[]; pagos: PagoNomina[]; historial: HistorialNomina[] }> {
    const params = new URLSearchParams({
      empleado_id: empleadoId,
      ...(filtros?.periodo_mes && { periodo_mes: filtros.periodo_mes }),
      ...(filtros?.periodo_anio && { periodo_anio: filtros.periodo_anio.toString() })
    });
    const response = await api.get(`/nomina/historial?${params}`);
    return response.data;
  },

  async eliminarHistorialNomina(data: {
    tipo: 'periodo' | 'fecha';
    periodo_mes?: string;
    periodo_anio?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Promise<{ message: string; deletedCount: number }> {
    const response = await api.delete('/nomina/historial', { data });
    return response.data;
  },

  async registrarPagoNomina(
    nominaDetalleId: string,
    data: {
      valor: number;
      fecha?: string;
      tipo?: 'QUINCENA' | 'AJUSTE' | 'COMPLEMENTO';
      observaciones?: string;
    }
  ): Promise<PagoNomina> {
    const response = await api.post(`/nomina/detalle/${nominaDetalleId}/pagos`, data);
    return response.data;
  },

  async descargarPDFNomina(nominaDetalleId: string): Promise<Blob> {
    const response = await api.get(`/nomina/detalle/${nominaDetalleId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async generarPDFPreview(nominaDetalle: NominaDetalle): Promise<Blob> {
    const response = await api.post('/nomina/generar-pdf-preview', {
      nomina_detalle: nominaDetalle
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ==================== LIQUIDACIÓN ====================
  async calcularLiquidacion(
    empleadoId: string,
    fechaRetiro: Date | string,
    motivoRetiro: string,
    params?: {
      base_liquidacion_manual?: number;
      salario_fijo?: boolean;
      promedio_12_meses?: number;
      incluir_auxilio_transporte?: boolean;
      dias_vacaciones?: number;
      dias_prima?: number;
      dias_cesantias?: number;
      dias_sueldo_pendientes?: number;
    }
  ): Promise<Liquidacion> {
    const response = await api.post('/nomina/liquidacion/calcular', {
      empleado_id: empleadoId,
      fecha_retiro: fechaRetiro instanceof Date ? fechaRetiro.toISOString() : fechaRetiro,
      motivo_retiro: motivoRetiro,
      ...params
    });
    return response.data;
  },

  async generarPDFLiquidacion(liquidacion: Liquidacion): Promise<Blob> {
    const response = await api.post('/nomina/liquidacion/pdf-preview', {
      liquidacion
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ========================
  // CONTROL DE ACCESO
  // ========================

  async getEstadoControlAcceso(): Promise<any> {
    const response = await api.get('/control-acceso/estado');
    return response.data;
  },

  async toggleServicioCerrado(activar: boolean): Promise<any> {
    const response = await api.post('/control-acceso/servicio-cerrado', { activar });
    return response.data;
  },

  async configurarHorarioAcceso(activo: boolean, horaInicio?: string, horaFin?: string): Promise<any> {
    const response = await api.put('/control-acceso/horario', { activo, horaInicio, horaFin });
    return response.data;
  },

  async getAuditoriaAcceso(limit: number = 50, offset: number = 0): Promise<any> {
    const response = await api.get(`/control-acceso/auditoria?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};

export default apiService;
