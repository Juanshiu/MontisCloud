"use client";

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Save, Plus, Trash2, Download, UploadCloud, RefreshCw, Eye, EyeOff, CreditCard, MapPin, X, AlertCircle, Search, Filter, Tag, Coffee } from 'lucide-react';
import { apiService } from '@/services/api';
import { AjustePersonalizacionInsumo, Insumo, Producto, RecetaProductoInsumo, CategoriaPersonalizacion, ItemPersonalizacion, InsumoHistorial, ConfiguracionSistema, Proveedor, InsumoCategoria } from '@/types';

const unidades = ['g', 'kg', 'ml', 'unidad'];

// Helper para formatear fecha y hora en zona horaria local (DD/MM/YYYY HH:MM a.m./p.m.)
const formatearFechaHora = (fechaStr: string | null | undefined): string => {
  if (!fechaStr) return '';
  try {
    const fecha = new Date(fechaStr);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    let hora = fecha.getHours();
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const ampm = hora >= 12 ? 'p. m.' : 'a. m.';
    hora = hora % 12;
    hora = hora ? hora : 12; // La hora 0 debe ser 12
    return `${dia}/${mes}/${anio} ${hora}:${minutos} ${ampm}`;
  } catch {
    return fechaStr;
  }
};

interface InsumoForm {
  nombre: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  stock_critico: number;
  costo_unitario: number | null;
  categoria_id: string | null;
}

export default function GestionInventarioAvanzado() {
  const [tab, setTab] = useState<'insumos' | 'recetas' | 'ajustes' | 'historial' | 'importacion' | 'configuracion' | 'proveedores' | 'categorias'>('insumos');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  
  // Categorías de Insumos
  const [insumoCategorias, setInsumoCategorias] = useState<InsumoCategoria[]>([]);
  const [categoriaForm, setCategoriaForm] = useState<Partial<InsumoCategoria>>({ nombre: '', descripcion: '' });
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(null);
  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false);
  const [categoriaError, setCategoriaError] = useState<string | null>(null);

  // Filtros y Búsqueda
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  const [configSistema, setConfigSistema] = useState<ConfiguracionSistema | null>(null);
  const [criticoModo, setCriticoModo] = useState<'CRITICO' | 'BAJO' | 'NUNCA'>('CRITICO');
  const [configError, setConfigError] = useState<string | null>(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorForm, setProveedorForm] = useState<Partial<Proveedor>>({
    nombre: '',
    documento: '',
    telefono: '',
    correo: '',
    direccion: '',
    descripcion: '',
    pais: '',
    departamento: '',
    ciudad: '',
    banco_nombre: '',
    banco_tipo_cuenta: 'Ahorros',
    banco_titular: '',
    banco_nit_titular: '',
    banco_numero_cuenta: ''
  });
  const [proveedorEditandoId, setProveedorEditandoId] = useState<string | null>(null);
  const [verBancosId, setVerBancosId] = useState<string | null>(null);
  const [proveedorError, setProveedorError] = useState<string | null>(null);
  const [mostrarModalProveedor, setMostrarModalProveedor] = useState(false);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumoForm, setInsumoForm] = useState<InsumoForm>({
    nombre: '',
    unidad_medida: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    stock_critico: 0,
    costo_unitario: null,
    categoria_id: null
  });
  const [insumoEditandoId, setInsumoEditandoId] = useState<string | null>(null);
  const [insumoError, setInsumoError] = useState<string | null>(null);
  const [mostrarModalInsumo, setMostrarModalInsumo] = useState(false);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string | null>(null);
  const [recetaItems, setRecetaItems] = useState<RecetaProductoInsumo[]>([]);
  const [recetaError, setRecetaError] = useState<string | null>(null);

  const [categoriasPersonalizacion, setCategoriasPersonalizacion] = useState<CategoriaPersonalizacion[]>([]);
  const [categoriaPersonalizacionId, setCategoriaPersonalizacionId] = useState<string | null>(null);
  const [itemsPersonalizacion, setItemsPersonalizacion] = useState<ItemPersonalizacion[]>([]);
  const [itemPersonalizacionId, setItemPersonalizacionId] = useState<string | null>(null);
  const [ajustesItems, setAjustesItems] = useState<AjustePersonalizacionInsumo[]>([]);
  const [ajustesError, setAjustesError] = useState<string | null>(null);

  const [ajusteInsumoId, setAjusteInsumoId] = useState<string | null>(null);
  const [ajusteProveedorId, setAjusteProveedorId] = useState<string | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState<number>(0);
  const [ajusteMotivo, setAjusteMotivo] = useState<string>('');
  const [ajusteError, setAjusteError] = useState<string | null>(null);
  const [ajustando, setAjustando] = useState(false);

  const [historial, setHistorial] = useState<InsumoHistorial[]>([]);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [historialInsumoId, setHistorialInsumoId] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [limpiandoHistorial, setLimpiandoHistorial] = useState(false);

  const limpiarHistorial = async (dias: number) => {
    if (!confirm(`¿Estás seguro de eliminar el historial de más de ${dias} días? Esta acción no se puede deshacer.`)) return;
    
    try {
      setLimpiandoHistorial(true);
      const res = await apiService.limpiarHistorialInsumos(dias);
      mostrarExito(res.message);
      if (tab === 'historial') {
        cargarHistorial();
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al limpiar historial');
    } finally {
      setLimpiandoHistorial(false);
    }
  };

  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState<{ mensaje?: string; creados?: number; actualizados?: number; errores?: { fila: number; mensaje?: string; hoja?: string }[] } | null>(null);

  const mostrarExito = (mensaje: string) => {
    setMensajeExito(mensaje);
    setTimeout(() => setMensajeExito(null), 3000);
  };

  useEffect(() => {
    cargarInsumos();
    cargarProductos();
    cargarCategoriasPersonalizacion();
    cargarConfiguracion();
    cargarProveedores();
    cargarInsumoCategorias();
  }, []);

  const cargarInsumoCategorias = async () => {
    try {
      const data = await apiService.getInsumoCategorias();
      setInsumoCategorias(data);
    } catch (error) {
      console.error('Error al cargar categorias de insumos:', error);
    }
  };

  const guardarCategoria = async () => {
    if (!categoriaForm.nombre?.trim()) {
      setCategoriaError('El nombre es obligatorio');
      return;
    }

    try {
      setCategoriaError(null);
      if (categoriaEditandoId) {
        await apiService.updateInsumoCategoria(categoriaEditandoId, categoriaForm);
      } else {
        await apiService.createInsumoCategoria(categoriaForm);
      }
      
      await cargarInsumoCategorias();
      cancelarEdicionCategoria();
      mostrarExito('Categoría guardada correctamente');
    } catch (error: any) {
      setCategoriaError(error?.response?.data?.error || 'Error al guardar categoría');
    }
  };

  const iniciarEdicionCategoria = (c: InsumoCategoria) => {
    setCategoriaEditandoId(c.id);
    setCategoriaForm({ ...c });
    setMostrarModalCategoria(true);
  };

  const cancelarEdicionCategoria = () => {
    setCategoriaEditandoId(null);
    setCategoriaForm({ nombre: '', descripcion: '' });
    setCategoriaError(null);
    setMostrarModalCategoria(false);
  };

  const eliminarCategoria = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Esto no eliminará los insumos asociados.')) return;
    try {
      await apiService.deleteInsumoCategoria(id);
      await cargarInsumoCategorias();
      await cargarInsumos(); // Recargar insumos para actualizar referencias de nombres
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al eliminar categoría');
    }
  };

  useEffect(() => {
    if (productoSeleccionadoId) {
      cargarRecetaProducto(productoSeleccionadoId);
    } else {
      setRecetaItems([]);
    }
  }, [productoSeleccionadoId]);

  useEffect(() => {
    if (categoriaPersonalizacionId) {
      cargarItemsPersonalizacion(categoriaPersonalizacionId);
    } else {
      setItemsPersonalizacion([]);
    }
  }, [categoriaPersonalizacionId]);

  useEffect(() => {
    if (itemPersonalizacionId) {
      cargarAjustesPersonalizacion(itemPersonalizacionId);
    } else {
      setAjustesItems([]);
    }
  }, [itemPersonalizacionId]);

  const cargarInsumos = async () => {
    try {
      const data = await apiService.getInsumos();
      setInsumos(data);
    } catch (error) {
      console.error('Error al cargar insumos:', error);
    }
  };

  const cargarProveedores = async () => {
    try {
      setCargandoProveedores(true);
      const data = await apiService.getProveedores();
      setProveedores(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setCargandoProveedores(false);
    }
  };

  const guardarProveedor = async () => {
    if (!proveedorForm.nombre?.trim()) {
      setProveedorError('El nombre es obligatorio');
      return;
    }

    try {
      setProveedorError(null);
      if (proveedorEditandoId) {
        await apiService.updateProveedor(proveedorEditandoId, proveedorForm);
      } else {
        await apiService.createProveedor(proveedorForm);
      }
      
      await cargarProveedores();
      cancelarEdicionProveedor();
      mostrarExito('Proveedor guardado correctamente');
    } catch (error: any) {
      setProveedorError(error?.response?.data?.error || 'Error al guardar proveedor');
    }
  };

  const iniciarEdicionProveedor = (p: Proveedor) => {
    setProveedorEditandoId(p.id);
    setProveedorForm({ ...p });
    setMostrarModalProveedor(true);
  };

  const cancelarEdicionProveedor = () => {
    setProveedorEditandoId(null);
    setProveedorForm({
      nombre: '', documento: '', telefono: '', correo: '',
      direccion: '', descripcion: '', pais: '', departamento: '', ciudad: '',
      banco_nombre: '', banco_tipo_cuenta: 'Ahorros', banco_titular: '',
      banco_nit_titular: '', banco_numero_cuenta: ''
    });
    setProveedorError(null);
    setMostrarModalProveedor(false);
  };

  const eliminarProveedor = async (id: string) => {
    if (!confirm('¿Eliminar proveedor?')) return;
    try {
      await apiService.deleteProveedor(id);
      await cargarProveedores();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al eliminar proveedor');
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const data = await apiService.getConfiguracionSistema();
      setConfigSistema(data);
      if (data?.critico_modo === 'CRITICO' || data?.critico_modo === 'BAJO' || data?.critico_modo === 'NUNCA') {
        setCriticoModo(data.critico_modo);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      const data = await apiService.getAllProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarCategoriasPersonalizacion = async () => {
    try {
      const data = await apiService.getCategoriasPersonalizacion();
      setCategoriasPersonalizacion(data);
    } catch (error) {
      console.error('Error al cargar categorías de personalización:', error);
    }
  };

  const cargarItemsPersonalizacion = async (categoriaId: string) => {
    try {
      const data = await apiService.getItemsPersonalizacion(categoriaId);
      setItemsPersonalizacion(data);
    } catch (error) {
      console.error('Error al cargar items de personalización:', error);
    }
  };

  const cargarRecetaProducto = async (productoId: string) => {
    try {
      const data = await apiService.getRecetaProducto(productoId);
      setRecetaItems(data);
    } catch (error) {
      console.error('Error al cargar receta:', error);
    }
  };

  const cargarAjustesPersonalizacion = async (itemId: string) => {
    try {
      const data = await apiService.getAjustesPersonalizacion(itemId);
      setAjustesItems(data);
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
    }
  };

  const cargarHistorial = useCallback(async () => {
    try {
      const data = await apiService.getInsumoHistorial(
        historialInsumoId || undefined, 
        200,
        fechaInicio || undefined,
        fechaFin || undefined
      );
      setHistorial(data || []);
      setHistorialError(null);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setHistorialError('Error al cargar historial');
    }
  }, [historialInsumoId, fechaInicio, fechaFin]);

  useEffect(() => {
    if (tab === 'historial') {
      cargarHistorial();
    }
  }, [tab, historialInsumoId, cargarHistorial]);

  const guardarConfiguracion = async () => {
    try {
      setGuardandoConfig(true);
      setConfigError(null);
      const nuevaConfig: ConfiguracionSistema = {
        inventario_avanzado: configSistema?.inventario_avanzado ?? false,
        critico_modo: criticoModo
      };
      const updated = await apiService.updateConfiguracionSistema(nuevaConfig);
      setConfigSistema(updated);
      mostrarExito('Configuración actualizada');
    } catch (error: any) {
      setConfigError(error?.response?.data?.error || 'Error al guardar configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const validarInsumoForm = () => {
    if (!insumoForm.nombre.trim()) {
      return 'El nombre es obligatorio';
    }
    if (!insumoForm.unidad_medida) {
      return 'La unidad de medida es obligatoria';
    }
    if (insumoForm.stock_actual < 0 || insumoForm.stock_minimo < 0 || insumoForm.stock_critico < 0) {
      return 'Los valores de stock deben ser mayores o iguales a 0';
    }
    if (insumoForm.stock_critico > insumoForm.stock_minimo) {
      return 'El stock crítico no puede ser mayor que el stock mínimo';
    }
    return null;
  };

  const guardarInsumo = async () => {
    const error = validarInsumoForm();
    if (error) {
      setInsumoError(error);
      return;
    }

    try {
      setInsumoError(null);
      if (insumoEditandoId) {
        await apiService.updateInsumo(insumoEditandoId, insumoForm);
      } else {
        await apiService.createInsumo(insumoForm);
      }

      await cargarInsumos();
      cancelarEdicionInsumo();
      mostrarExito('Insumo guardado correctamente');
    } catch (error: any) {
      setInsumoError(error?.response?.data?.error || 'Error al guardar insumo');
    }
  };

  const iniciarEdicionInsumo = (insumo: Insumo) => {
    setInsumoEditandoId(insumo.id);
    setInsumoForm({
      nombre: insumo.nombre,
      unidad_medida: insumo.unidad_medida,
      stock_actual: insumo.stock_actual,
      stock_minimo: insumo.stock_minimo,
      stock_critico: insumo.stock_critico,
      costo_unitario: insumo.costo_unitario ?? null,
      categoria_id: insumo.categoria_id ?? null
    });
    setMostrarModalInsumo(true);
  };

  const cancelarEdicionInsumo = () => {
    setInsumoEditandoId(null);
    setInsumoForm({
      nombre: '',
      unidad_medida: 'g',
      stock_actual: 0,
      stock_minimo: 0,
      stock_critico: 0,
      costo_unitario: null,
      categoria_id: null
    });
    setMostrarModalInsumo(false);
    setInsumoError(null);
  };

  const eliminarInsumo = async (id: string) => {
    if (!confirm('¿Eliminar insumo?')) return;
    try {
      await apiService.deleteInsumo(id);
      await cargarInsumos();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al eliminar insumo');
    }
  };

  const agregarFilaReceta = () => {
    if (insumos.length === 0) {
      setRecetaError('Debe crear insumos antes de agregar receta');
      return;
    }
    setRecetaItems(prev => ([
      ...prev,
      { producto_id: productoSeleccionadoId || '', insumo_id: insumos[0].id, cantidad_usada: 1 }
    ]));
  };

  const guardarReceta = async () => {
    if (!productoSeleccionadoId) {
      setRecetaError('Seleccione un producto');
      return;
    }

    const validas = recetaItems.filter(r => r.insumo_id && r.cantidad_usada > 0);
    try {
      setRecetaError(null);
      await apiService.updateRecetaProducto(productoSeleccionadoId, validas);
      await cargarRecetaProducto(productoSeleccionadoId);
      mostrarExito('Receta guardada correctamente');
    } catch (error: any) {
      setRecetaError(error?.response?.data?.error || 'Error al guardar receta');
    }
  };

  const agregarFilaAjuste = () => {
    if (insumos.length === 0) {
      setAjustesError('Debe crear insumos antes de agregar ajustes');
      return;
    }
    setAjustesItems(prev => ([
      ...prev,
      { item_personalizacion_id: itemPersonalizacionId || '', insumo_id: insumos[0].id, cantidad_ajuste: 1 }
    ]));
  };

  const guardarAjustes = async () => {
    if (!itemPersonalizacionId) {
      setAjustesError('Seleccione una personalización');
      return;
    }

    const validos = ajustesItems.filter(a => a.insumo_id && a.cantidad_ajuste !== 0);
    try {
      setAjustesError(null);
      await apiService.updateAjustesPersonalizacion(itemPersonalizacionId, validos);
      await cargarAjustesPersonalizacion(itemPersonalizacionId);
      mostrarExito('Ajustes guardados correctamente');
    } catch (error: any) {
      setAjustesError(error?.response?.data?.error || 'Error al guardar ajustes');
    }
  };

  const aplicarAjusteManual = async () => {
    if (!ajusteInsumoId) {
      setAjusteError('Seleccione un insumo');
      return;
    }
    if (!ajusteCantidad || Number.isNaN(ajusteCantidad)) {
      setAjusteError('La cantidad es obligatoria');
      return;
    }

    try {
      setAjustando(true);
      setAjusteError(null);
      await apiService.ajustarInsumo(ajusteInsumoId, {
        cantidad: ajusteCantidad,
        motivo: ajusteMotivo || undefined,
        proveedor_id: ajusteProveedorId || undefined
      });
      await cargarInsumos();
      await cargarHistorial();
      setAjusteCantidad(0);
      setAjusteMotivo('');
      setAjusteProveedorId(null);
      mostrarExito('Ajuste aplicado correctamente');
    } catch (error: any) {
      setAjusteError(error?.response?.data?.error || 'Error al aplicar ajuste');
    } finally {
      setAjustando(false);
    }
  };

  const descargarArchivo = (blob: Blob, nombre: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const leerArchivoBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const insumosFiltrados = insumos.filter(insumo => {
    const cumpleNombre = insumo.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const cumpleCategoria = filtroCategoria === 'todos' || 
                           (filtroCategoria === 'sin_categoria' && !insumo.categoria_id) ||
                           (insumo.categoria_id?.toString() === filtroCategoria);
    return cumpleNombre && cumpleCategoria;
  });

  const manejarImportacion = async (file: File | null, tipo: 'insumos' | 'recetas' | 'productos' | 'personalizaciones') => {
    if (!file) return;
    setImportando(true);
    setImportResult(null);
    try {
      const base64 = await leerArchivoBase64(file);
      let result: any;
      if (tipo === 'insumos') {
        result = await apiService.importarInsumos(base64);
      } else if (tipo === 'recetas') {
        result = await apiService.importarRecetas(base64);
      } else if (tipo === 'personalizaciones') {
        result = await apiService.importarPersonalizaciones(base64);
      } else {
        result = await apiService.importarProductosExcel(base64);
      }
      
      const msg = result?.mensaje || 'Importación completada';
      mostrarExito(msg);
      setImportResult(result);
      
      await cargarInsumos();
      await cargarProductos();
      await cargarCategoriasPersonalizacion();
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || 'Error en importación';
      alert(errMsg);
      setImportResult(null);
    } finally {
      setImportando(false);
    }
  };

  const costosPorInsumo = new Map(insumos.map(insumo => [insumo.id, insumo.costo_unitario ?? 0]));
  const obtenerCosto = (insumoId: string) => costosPorInsumo.get(insumoId) || 0;
  const totalCostoReceta = recetaItems.reduce((sum, item) => sum + (obtenerCosto(item.insumo_id) * item.cantidad_usada), 0);
  const totalCostoAjustes = ajustesItems.reduce((sum, item) => sum + (obtenerCosto(item.insumo_id) * item.cantidad_ajuste), 0);

  return (
    <div className="space-y-6 overflow-auto">
      <div className="">
        <div className="flex items-center justify-between">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">Inventario Avanzado</h2>
                <p className="text-sm text-secondary-600">Insumos, recetas y ajustes de personalizaciones.</p>
          </div>
          <button
            className="btn-secondary flex items-center"
            onClick={cargarInsumos}
          >
            <RefreshCw size={16} className="mr-2" />
            Recargar
          </button>
        </div>

        {mensajeExito && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            {mensajeExito}
          </div>
        )}
      </div>

      {/* Pestañas */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {['insumos', 'recetas', 'ajustes', 'historial', 'proveedores', 'categorias', 'importacion', 'configuracion'].map((section) => (
            <button
              key={section}
              onClick={() => setTab(section as any)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${tab === section
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }
              `}
            >
              {section === 'insumos' ? 'Insumos' : 
               section === 'recetas' ? 'Recetas' : 
               section === 'ajustes' ? 'Ajustes manuales' : 
               section === 'historial' ? 'Historial' : 
               section === 'proveedores' ? 'Proveedores' :
               section === 'categorias' ? 'Categorías' :
               section === 'configuracion' ? 'Configuración' : 
               'Importar/Exportar'}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'insumos' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-xl font-bold text-secondary-900">Inventario de Insumos</h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar insumo..."
                  className="input-field w-full pl-10"
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-secondary-500" />
                <select
                  className="input-field py-2"
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  <option value="todos">Todas las categorías</option>
                  <option value="sin_categoria">Sin categoría</option>
                  {insumoCategorias.map(cat => (
                    <option key={cat.id} value={cat.id.toString()}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <button 
                className="btn-primary flex items-center whitespace-nowrap"
                onClick={() => {
                  cancelarEdicionInsumo();
                  setMostrarModalInsumo(true);
                }}
              >
                <Plus size={18} className="mr-2" />
                Nuevo Insumo
              </button>
            </div>
          </div>

          {mostrarModalInsumo && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-secondary-900">
                    {insumoEditandoId ? 'Editar Insumo' : 'Nuevo Insumo'}
                  </h3>
                  <button onClick={cancelarEdicionInsumo} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Nombre del Insumo *</label>
                      <input
                        className="input-field w-full"
                        placeholder="Ej: Tomate, Harina, Aceite..."
                        value={insumoForm.nombre}
                        onChange={(e) => setInsumoForm(prev => ({ ...prev, nombre: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Categoría</label>
                      <select
                        className="input-field w-full"
                        value={insumoForm.categoria_id || ''}
                        onChange={(e) => setInsumoForm(prev => ({ ...prev, categoria_id: e.target.value || null }))}
                      >
                        <option value="">Sin categoría</option>
                        {insumoCategorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Unidad de medida *</label>
                      <select
                        className="input-field w-full"
                        value={insumoForm.unidad_medida}
                        onChange={(e) => setInsumoForm(prev => ({ ...prev, unidad_medida: e.target.value }))}
                      >
                        {unidades.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Stock Actual *</label>
                      <input
                        type="number"
                        className="input-field w-full"
                        value={insumoForm.stock_actual}
                        onChange={(e) => setInsumoForm(prev => ({ ...prev, stock_actual: Number(e.target.value) }))}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Costo Unitario (Opcional)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">$</span>
                        <input
                          type="number"
                          className="input-field w-full pl-7"
                          placeholder="0.00"
                          value={insumoForm.costo_unitario ?? ''}
                          onChange={(e) => setInsumoForm(prev => ({ ...prev, costo_unitario: e.target.value === '' ? null : Number(e.target.value) }))}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-yellow-700">Stock Mínimo (Alerta Amarilla)</label>
                      <input
                        type="number"
                        className="input-field w-full border-yellow-200 focus:ring-yellow-500"
                        value={insumoForm.stock_minimo}
                        onChange={(e) => setInsumoForm(prev => ({ ...prev, stock_minimo: Number(e.target.value) }))}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-red-700">Stock Crítico (Alerta Roja)</label>
                      <input
                        type="number"
                        className="input-field w-full border-red-200 focus:ring-red-500"
                        value={insumoForm.stock_critico}
                        onChange={(e) => setInsumoForm(prev => ({ ...prev, stock_critico: Number(e.target.value) }))}
                        min="0"
                      />
                    </div>
                  </div>

                  {insumoError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center text-red-700">
                      <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                      <p className="text-sm">{insumoError}</p>
                    </div>
                  )}
                </div>

                <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
                  <button className="btn-secondary px-6" onClick={cancelarEdicionInsumo}>
                    Cancelar
                  </button>
                  <button className="btn-primary flex items-center px-8" onClick={guardarInsumo}>
                    <Save size={18} className="mr-2" />
                    {insumoEditandoId ? 'Actualizar Cambios' : 'Crear Insumo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Categoría</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Stock</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Costo unitario</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {insumosFiltrados.map((insumo) => (
                  <tr key={insumo.id}>
                    <td className="px-4 py-2 text-sm text-secondary-500 font-mono">{insumo.codigo || '—'}</td>
                    <td className="px-4 py-2 text-sm text-secondary-900 font-medium">{insumo.nombre}</td>
                    <td className="px-4 py-2 text-sm">
                      {insumo.categoria_nombre ? (
                        <span className="flex items-center gap-1 text-secondary-600">
                          <Tag size={12} className="text-secondary-400" />
                          {insumo.categoria_nombre}
                        </span>
                      ) : (
                        <span className="text-secondary-400 italic text-xs">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-secondary-700">{insumo.unidad_medida}</td>
                    <td className="px-4 py-2 text-sm text-secondary-700 font-mono">{insumo.stock_actual}</td>
                    <td className="px-4 py-2 text-sm text-secondary-700">
                      {insumo.costo_unitario !== null && insumo.costo_unitario !== undefined ? `$${Number(insumo.costo_unitario).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                        insumo.estado === 'AGOTADO' ? 'bg-red-600 text-white' :
                        insumo.estado === 'CRITICO' ? 'bg-red-100 text-red-700 border border-red-200' :
                        insumo.estado === 'BAJO' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {insumo.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1 text-xs rounded border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition shadow-sm"
                          onClick={() => iniciarEdicionInsumo(insumo)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 text-xs rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition shadow-sm"
                          onClick={() => eliminarInsumo(insumo.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {insumosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-sm text-secondary-500 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="text-secondary-200" />
                        <p>{(filtroNombre || filtroCategoria !== 'todos') ? 'No se encontraron insumos con esos filtros' : 'No hay insumos registrados'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {tab === 'recetas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recetas por producto */}
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 flex flex-col">
            <div className="p-6 border-b border-secondary-100 bg-blue-50/50 rounded-t-xl">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <Coffee size={22} className="text-blue-600" />
                Recetas por Producto
              </h3>
              <p className="text-sm text-blue-600/70 mt-1 font-medium">Configura los insumos que se descuentan al vender un plato.</p>
            </div>

            <div className="p-6 space-y-6 flex-grow">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                  <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Seleccionar Producto</label>
                  <select
                    className="input-field w-full h-11"
                    value={productoSeleccionadoId ?? ''}
                    onChange={(e) => setProductoSeleccionadoId(e.target.value || null)}
                  >
                    <option value="">Selecciona un producto...</option>
                    {productos.map(producto => (
                      <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                    ))}
                  </select>
                </div>
                {productoSeleccionadoId && (
                  <div className="flex items-end">
                    <button 
                      className="btn-secondary h-11 px-4 flex items-center gap-2 bg-white hover:bg-secondary-50 transition-colors border-secondary-300" 
                      onClick={agregarFilaReceta}
                    >
                      <Plus size={18} className="text-primary-600" />
                      <span>Agregar Insumo</span>
                    </button>
                  </div>
                )}
              </div>

              {recetaError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-700 animate-pulse">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{recetaError}</p>
                </div>
              )}

              <div className="border rounded-xl overflow-hidden bg-secondary-50/30">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-100/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-secondary-600 uppercase">Insumo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-secondary-600 uppercase w-28">Cant.</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-secondary-600 uppercase">Costo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-secondary-600 uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-100">
                    {recetaItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-secondary-400">
                          <div className="flex flex-col items-center gap-2">
                            <Tag size={32} className="opacity-20" />
                            <p className="text-sm italic">No hay insumos definidos para este producto.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recetaItems.map((item, index) => (
                        <tr key={index} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <select
                              className="w-full bg-transparent border-none focus:ring-0 text-secondary-800 text-sm font-medium p-0"
                              value={item.insumo_id}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRecetaItems(prev => prev.map((r, i) => i === index ? { ...r, insumo_id: value } : r));
                              }}
                            >
                              {insumos.map(insumo => (
                                <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="w-full bg-transparent border-b border-transparent focus:border-primary-500 focus:ring-0 text-sm font-mono p-0"
                                value={item.cantidad_usada}
                                min="0"
                                step="0.01"
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setRecetaItems(prev => prev.map((r, i) => i === index ? { ...r, cantidad_usada: value } : r));
                                }}
                              />
                              <span className="text-[10px] font-bold text-secondary-400 uppercase">
                                {insumos.find(ins => ins.id === item.insumo_id)?.unidad_medida || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-secondary-600">
                            ${(obtenerCosto(item.insumo_id) * item.cantidad_usada).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className="p-1.5 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              onClick={() => setRecetaItems(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {recetaItems.length > 0 && (
                    <tfoot className="bg-secondary-50/50">
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-sm font-bold text-secondary-900 text-right uppercase tracking-wider">
                          Costo Sugerido del Plato:
                        </td>
                        <td className="px-4 py-4 text-right text-lg font-bold text-primary-600 font-mono">
                          ${totalCostoReceta.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {productoSeleccionadoId && (
              <div className="p-6 bg-secondary-50 rounded-b-xl border-t">
                <button 
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20" 
                  onClick={guardarReceta}
                >
                  <Save size={20} />
                  <span className="font-bold">Guardar Cambios en Receta</span>
                </button>
              </div>
            )}
          </div>

          {/* Ajustes por personalización */}
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 flex flex-col">
            <div className="p-6 border-b border-secondary-100 bg-purple-50/50 rounded-t-xl">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <Plus size={22} className="text-purple-600" />
                Insumos por Adición / Opción
              </h3>
              <p className="text-sm text-purple-600/70 mt-1 font-medium">Define qué ingredientes gasta una personalización extra.</p>
            </div>

            <div className="p-6 space-y-6 flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Categoría</label>
                  <select
                    className="input-field w-full h-11"
                    value={categoriaPersonalizacionId ?? ''}
                    onChange={(e) => setCategoriaPersonalizacionId(e.target.value || null)}
                  >
                    <option value="">Selecciona categoría...</option>
                    {categoriasPersonalizacion.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Item o Adición</label>
                  <select
                    className="input-field w-full h-11"
                    disabled={!categoriaPersonalizacionId}
                    value={itemPersonalizacionId ?? ''}
                    onChange={(e) => setItemPersonalizacionId(e.target.value || null)}
                  >
                    <option value="">Selecciona item...</option>
                    {itemsPersonalizacion.map(item => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {itemPersonalizacionId && (
                <div className="flex justify-start">
                  <button 
                    className="btn-secondary h-11 px-6 flex items-center gap-2 bg-white hover:bg-secondary-50 border-secondary-300" 
                    onClick={agregarFilaAjuste}
                  >
                    <Plus size={18} className="text-purple-600" />
                    <span>Agregar Ingrediente</span>
                  </button>
                </div>
              )}

              {ajustesError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{ajustesError}</p>
                </div>
              )}

              <div className="border rounded-xl overflow-hidden bg-secondary-50/30">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-100/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-secondary-600 uppercase">Insumo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-secondary-600 uppercase w-28">Cant.</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-secondary-600 uppercase">Costo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-secondary-600 uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-100">
                    {ajustesItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-secondary-400">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw size={32} className="opacity-20" />
                            <p className="text-sm italic">Sin insumos configurados para esta opción.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ajustesItems.map((item, index) => (
                        <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <select
                              className="w-full bg-transparent border-none focus:ring-0 text-secondary-800 text-sm font-medium p-0"
                              value={item.insumo_id}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAjustesItems(prev => prev.map((r, i) => i === index ? { ...r, insumo_id: value } : r));
                              }}
                            >
                              {insumos.map(insumo => (
                                <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="w-full bg-transparent border-b border-transparent focus:border-purple-500 focus:ring-0 text-sm font-mono p-0"
                                value={item.cantidad_ajuste}
                                step="0.01"
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setAjustesItems(prev => prev.map((r, i) => i === index ? { ...r, cantidad_ajuste: value } : r));
                                }}
                              />
                              <span className="text-[10px] font-bold text-secondary-400 uppercase">
                                {insumos.find(ins => ins.id === item.insumo_id)?.unidad_medida || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-secondary-600">
                            ${(obtenerCosto(item.insumo_id) * item.cantidad_ajuste).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className="p-1.5 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              onClick={() => setAjustesItems(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {ajustesItems.length > 0 && (
                    <tfoot className="bg-secondary-50/50">
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-sm font-bold text-secondary-900 text-right uppercase tracking-wider">
                          Costo Extra Total:
                        </td>
                        <td className="px-4 py-4 text-right text-lg font-bold text-purple-600 font-mono">
                          ${totalCostoAjustes.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {itemPersonalizacionId && (
              <div className="p-6 bg-secondary-50 rounded-b-xl border-t mt-auto">
                <button 
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700 border-none" 
                  onClick={guardarAjustes}
                >
                  <Save size={20} />
                  <span className="font-bold">Guardar Costos de Adición</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'ajustes' && (
        <div className="bg-white rounded-lg shadow  space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900">Ajustes manuales de stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Insumo</label>
              <select
                className="input-field"
                value={ajusteInsumoId ?? ''}
                onChange={(e) => setAjusteInsumoId(e.target.value || null)}
              >
                <option value="">Selecciona un insumo</option>
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Proveedor (Opcional)</label>
              <select
                className="input-field"
                value={ajusteProveedorId || ''}
                onChange={(e) => setAjusteProveedorId(e.target.value || null)}
              >
                <option value="">Ninguno</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Cantidad (+/-)</label>
              <input
                type="number"
                className="input-field"
                value={ajusteCantidad}
                step="0.01"
                onChange={(e) => setAjusteCantidad(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Motivo (opcional)</label>
              <input
                className="input-field"
                value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
              />
            </div>
          </div>

          {ajusteError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{ajusteError}</p>
            </div>
          )}

          <button className="btn-primary" onClick={aplicarAjusteManual} disabled={ajustando}>
            Aplicar ajuste
          </button>
        </div>
      )}

      {tab === 'configuracion' && (
        <div className="bg-white rounded-lg shadow  space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900">Regla de bloqueo por inventario</h3>
            <p className="text-sm text-secondary-600">Configura cuándo bloquear el cierre de comandas si algún insumo está en riesgo.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <select
              className="input-field max-w-xs"
              value={criticoModo}
              onChange={(e) => setCriticoModo(e.target.value as 'CRITICO' | 'BAJO' | 'NUNCA')}
            >
              <option value="CRITICO">Bloquear solo crítico</option>
              <option value="BAJO">Bloquear bajo y crítico</option>
              <option value="NUNCA">No bloquear (solo avisar)</option>
            </select>
            <button
              className="btn-primary flex items-center"
              onClick={guardarConfiguracion}
              disabled={guardandoConfig}
            >
              <Save size={16} className="mr-2" />
              Guardar configuración
            </button>
          </div>
          {configError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{configError}</p>
            </div>
          )}

          <div className="pt-6 border-t border-secondary-100">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">Mantenimiento del Sistema</h3>
            <p className="text-sm text-secondary-600 mb-4">Limpia el historial de movimientos de insumos para mantener el sistema ligero. Se recomienda dejar al menos 30-90 días de historial.</p>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => limpiarHistorial(30)}
                disabled={limpiandoHistorial}
                className="px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-sm font-medium transition-colors border border-secondary-200"
              >
                Limpiar historial &gt; 30 días
              </button>
              <button 
                onClick={() => limpiarHistorial(90)}
                disabled={limpiandoHistorial}
                className="px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-sm font-medium transition-colors border border-secondary-200"
              >
                Limpiar historial &gt; 90 días
              </button>
              <button 
                onClick={() => {
                  const dias = prompt('¿A partir de cuántos días quieres limpiar?', '180');
                  if (dias && !isNaN(Number(dias))) {
                    limpiarHistorial(Number(dias));
                  }
                }}
                disabled={limpiandoHistorial}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors border border-red-200"
              >
                Limpieza personalizada
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-white rounded-lg shadow space-y-4 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <div className="flex-grow max-w-xs">
              <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Filtrar por Insumo</label>
              <select
                className="input-field w-full h-11"
                value={historialInsumoId ?? ''}
                onChange={(e) => setHistorialInsumoId(e.target.value || null)}
              >
                <option value="">Todos los insumos</option>
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-44">
              <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Desde</label>
              <input 
                type="date" 
                className="input-field w-full h-11"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="w-full md:w-44">
              <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Hasta</label>
              <input 
                type="date" 
                className="input-field w-full h-11"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button 
                className="btn-secondary h-11 px-4 flex items-center gap-2 bg-white" 
                onClick={() => {
                  setFechaInicio('');
                  setFechaFin('');
                  setHistorialInsumoId(null);
                }}
              >
                Limpiar
              </button>
              <button 
                className="btn-primary h-11 px-6 flex items-center gap-2" 
                onClick={cargarHistorial}
              >
                <RefreshCw size={18} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {historialError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{historialError}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Insumo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Proveedor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Cantidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Evento</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {historial.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-secondary-700">{formatearFechaHora(item.fecha_hora)}</td>
                    <td className="px-4 py-2 text-sm text-secondary-900">{item.insumo_nombre || item.insumo_id}</td>
                    <td className="px-4 py-2 text-sm text-secondary-600 font-medium">
                      {item.proveedor_nombre || '-'}
                    </td>
                    <td className={`px-4 py-2 text-sm ${item.cantidad < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.cantidad} {item.unidad_medida}
                    </td>
                    <td className="px-4 py-2 text-sm text-secondary-700">{item.tipo_evento}</td>
                    <td className="px-4 py-2 text-sm text-secondary-600">{item.motivo || '—'}</td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-sm text-secondary-500 text-center">Sin movimientos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'proveedores' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-secondary-900">Gestión de Proveedores</h3>
            <button 
              className="btn-primary flex items-center"
              onClick={() => {
                cancelarEdicionProveedor();
                setMostrarModalProveedor(true);
              }}
            >
              <Plus size={18} className="mr-2" />
              Nuevo Proveedor
            </button>
          </div>

          {mostrarModalProveedor && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                  <h3 className="text-xl font-bold text-secondary-900">
                    {proveedorEditandoId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h3>
                  <button onClick={cancelarEdicionProveedor} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Nombre completo *</label>
                      <input
                        className="input-field w-full"
                        placeholder="Nombre o Razón Social"
                        value={proveedorForm.nombre || ''}
                        onChange={(e) => setProveedorForm(prev => ({ ...prev, nombre: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">CC o NIT</label>
                      <input
                        className="input-field w-full"
                        placeholder="Identificación fiscal"
                        value={proveedorForm.documento || ''}
                        onChange={(e) => setProveedorForm(prev => ({ ...prev, documento: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Teléfono</label>
                      <input
                        className="input-field w-full"
                        placeholder="Número de contacto"
                        value={proveedorForm.telefono || ''}
                        onChange={(e) => setProveedorForm(prev => ({ ...prev, telefono: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Correo</label>
                      <input
                        type="email"
                        className="input-field w-full"
                        placeholder="correo@ejemplo.com"
                        value={proveedorForm.correo || ''}
                        onChange={(e) => setProveedorForm(prev => ({ ...prev, correo: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-secondary-700 mb-1">Descripción (¿Qué artículos trae?)</label>
                      <input
                        className="input-field w-full"
                        placeholder="Ej: Carnes, Verduras, Insumos de aseo..."
                        value={proveedorForm.descripcion || ''}
                        onChange={(e) => setProveedorForm(prev => ({ ...prev, descripcion: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-md font-bold text-secondary-800 flex items-center">
                      <MapPin size={18} className="mr-2 text-primary-500" />
                      Ubicación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Dirección</label>
                        <input
                          className="input-field w-full"
                          value={proveedorForm.direccion || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, direccion: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Ciudad</label>
                        <input
                          className="input-field w-full"
                          value={proveedorForm.ciudad || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, ciudad: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Departamento</label>
                        <input
                          className="input-field w-full"
                          value={proveedorForm.departamento || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, departamento: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-md font-bold text-secondary-800 flex items-center">
                      <CreditCard size={18} className="mr-2 text-primary-500" />
                      Datos Bancarios (Opcional)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Nombre Banco</label>
                        <input
                          className="input-field w-full"
                          value={proveedorForm.banco_nombre || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, banco_nombre: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Tipo de Cuenta</label>
                        <select
                          className="input-field w-full"
                          value={proveedorForm.banco_tipo_cuenta || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, banco_tipo_cuenta: e.target.value }))}
                        >
                          <option value="Ahorros">Ahorros</option>
                          <option value="Corriente">Corriente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Número de Cuenta</label>
                        <input
                          className="input-field w-full font-mono"
                          value={proveedorForm.banco_numero_cuenta || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, banco_numero_cuenta: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">Titular de Cuenta</label>
                        <input
                          className="input-field w-full"
                          value={proveedorForm.banco_titular || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, banco_titular: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-secondary-700 mb-1">NIT Titular</label>
                        <input
                          className="input-field w-full"
                          value={proveedorForm.banco_nit_titular || ''}
                          onChange={(e) => setProveedorForm(prev => ({ ...prev, banco_nit_titular: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {proveedorError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center text-red-700">
                      <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                      <p className="text-sm">{proveedorError}</p>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
                  <button className="btn-secondary px-6" onClick={cancelarEdicionProveedor}>
                    Cancelar
                  </button>
                  <button className="btn-primary flex items-center px-8" onClick={guardarProveedor}>
                    <Save size={18} className="mr-2" />
                    {proveedorEditandoId ? 'Actualizar Cambios' : 'Guardar Proveedor'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Ubicación</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {proveedores.map(p => (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-secondary-900">
                        <div>{p.nombre}</div>
                        {p.descripcion && <div className="text-xs text-primary-600 font-normal italic">{p.descripcion}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600">{p.documento || '-'}</td>
                      <td className="px-4 py-3 text-sm text-secondary-600">
                        <div>{p.telefono || '-'}</div>
                        <div className="text-xs text-secondary-400">{p.correo || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600">
                        <div className="flex items-start">
                          <MapPin size={14} className="mr-1 mt-0.5 text-secondary-400" />
                          <div>
                            {p.direccion && <div className="text-secondary-800">{p.direccion}</div>}
                            <div className="text-xs text-secondary-500">{p.ciudad}, {p.departamento}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button 
                            className={`p-1 rounded ${verBancosId === p.id ? 'bg-primary-100 text-primary-600' : 'text-secondary-400 hover:text-primary-600'}`}
                            onClick={() => setVerBancosId(verBancosId === p.id ? null : p.id)}
                            title="Ver datos bancarios"
                          >
                            <CreditCard size={18} />
                          </button>
                          <button className="text-primary-600 hover:text-primary-900 p-1" onClick={() => iniciarEdicionProveedor(p)}>
                            <Save size={18} />
                          </button>
                          <button className="text-red-600 hover:text-red-900 p-1" onClick={() => eliminarProveedor(p.id)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {verBancosId === p.id && (
                      <tr className="bg-primary-50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-primary-700 uppercase">Banco</span>
                              <span className="text-secondary-800 font-medium">{p.banco_nombre || 'No especificado'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-primary-700 uppercase">Tipo de Cuenta</span>
                              <span className="text-secondary-800">{p.banco_tipo_cuenta || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-primary-700 uppercase">Número de Cuenta</span>
                              <span className="text-secondary-800 font-mono font-bold tracking-wider">{p.banco_numero_cuenta || '—'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-primary-700 uppercase">Titular</span>
                              <span className="text-secondary-800">{p.banco_titular || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-primary-700 uppercase">NIT/CC Titular</span>
                              <span className="text-secondary-800">{p.banco_nit_titular || '-'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {proveedores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-secondary-500">
                      No hay proveedores registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'categorias' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-secondary-900">Categorías de Insumos</h3>
            <button 
              className="btn-primary flex items-center"
              onClick={() => {
                cancelarEdicionCategoria();
                setMostrarModalCategoria(true);
              }}
            >
              <Plus size={18} className="mr-2" />
              Nueva Categoría
            </button>
          </div>

          {mostrarModalCategoria && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-secondary-900">
                    {categoriaEditandoId ? 'Editar Categoría' : 'Nueva Categoría'}
                  </h3>
                  <button onClick={cancelarEdicionCategoria} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 mb-1">Nombre de la Categoría *</label>
                    <input
                      className="input-field w-full"
                      placeholder="Ej: Verduras, Carnes, Abarrotes..."
                      value={categoriaForm.nombre}
                      onChange={(e) => setCategoriaForm(prev => ({ ...prev, nombre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 mb-1">Descripción (Opcional)</label>
                    <textarea
                      className="input-field w-full"
                      rows={3}
                      value={categoriaForm.descripcion || ''}
                      onChange={(e) => setCategoriaForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    />
                  </div>

                  {categoriaError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center text-red-700">
                      <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                      <p className="text-sm">{categoriaError}</p>
                    </div>
                  )}
                </div>

                <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
                  <button className="btn-secondary px-6" onClick={cancelarEdicionCategoria}>
                    Cancelar
                  </button>
                  <button className="btn-primary flex items-center px-8" onClick={guardarCategoria}>
                    <Save size={18} className="mr-2" />
                    {categoriaEditandoId ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {insumoCategorias.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-6 py-4 text-sm text-secondary-900 font-medium">{cat.nombre}</td>
                    <td className="px-6 py-4 text-sm text-secondary-600">{cat.descripcion || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-primary-600 hover:text-primary-800"
                          onClick={() => iniciarEdicionCategoria(cat)}
                          title="Editar"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => eliminarCategoria(cat.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {insumoCategorias.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-sm text-secondary-500 text-center">No hay categorías</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'importacion' && (
        <div className="bg-white rounded-lg shadow space-y-4 p-4">
          <h3 className="text-lg font-semibold text-secondary-900">Importar / Exportar Datos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Insumos */}
            <div className="border rounded-lg p-4 space-y-3 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={18} className="text-primary-500" />
                <p className="font-bold text-secondary-800">Insumos</p>
              </div>
              <button
                className="btn-secondary w-full flex items-center justify-center py-2"
                onClick={async () => {
                  const blob = await apiService.exportarInsumos();
                  descargarArchivo(blob, 'insumos.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <div className="relative">
                <input
                  id="import-insumos"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'insumos')}
                  disabled={importando}
                />
                <label 
                  htmlFor="import-insumos"
                  className={`btn-primary w-full flex items-center justify-center py-2 cursor-pointer ${importando ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <UploadCloud size={16} className="mr-2" />
                  Importar
                </label>
              </div>
            </div>

            {/* Recetas */}
            <div className="border rounded-lg p-4 space-y-3 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={18} className="text-orange-500" />
                <p className="font-bold text-secondary-800">Recetas / Costos Per.</p>
              </div>
              <button
                className="btn-secondary w-full flex items-center justify-center py-2"
                onClick={async () => {
                  const blob = await apiService.exportarRecetas();
                  descargarArchivo(blob, 'recetas.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <div className="relative">
                <input
                  id="import-recetas"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'recetas')}
                  disabled={importando}
                />
                <label 
                  htmlFor="import-recetas"
                  className={`btn-primary w-full flex items-center justify-center py-2 cursor-pointer ${importando ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <UploadCloud size={16} className="mr-2" />
                  Importar
                </label>
              </div>
            </div>

            {/* Productos */}
            <div className="border rounded-lg p-4 space-y-3 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Save size={18} className="text-green-500" />
                <p className="font-bold text-secondary-800">Productos</p>
              </div>
              <button
                className="btn-secondary w-full flex items-center justify-center py-2"
                onClick={async () => {
                  const blob = await apiService.exportarProductosExcel();
                  descargarArchivo(blob, 'productos.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <div className="relative">
                <input
                  id="import-productos"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'productos')}
                  disabled={importando}
                />
                <label 
                  htmlFor="import-productos"
                  className={`btn-primary w-full flex items-center justify-center py-2 cursor-pointer ${importando ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <UploadCloud size={16} className="mr-2" />
                  Importar
                </label>
              </div>
            </div>

            {/* Personalizaciones */}
            <div className="border rounded-lg p-4 space-y-3 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Plus size={18} className="text-purple-500" />
                <p className="font-bold text-secondary-800">Personalizaciones</p>
              </div>
              <button
                className="btn-secondary w-full flex items-center justify-center py-2"
                onClick={async () => {
                  const blob = await apiService.exportarPersonalizaciones();
                  descargarArchivo(blob, 'personalizaciones.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <div className="relative">
                <input
                  id="import-personalizaciones"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'personalizaciones')}
                  disabled={importando}
                />
                <label 
                  htmlFor="import-personalizaciones"
                  className={`btn-primary w-full flex items-center justify-center py-2 cursor-pointer ${importando ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <UploadCloud size={16} className="mr-2" />
                  Importar
                </label>
              </div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-3">
            <UploadCloud size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p><strong>Recomendación:</strong> Exporta primero el archivo actual para tener la plantilla con el formato correcto y los códigos existentes. Al re-importar, el sistema usará los códigos (ej: PROD-001, INS-001) para actualizar registros existentes o crear nuevos.</p>
            </div>
          </div>
          {importResult && (
            <div className="p-4 bg-white border border-secondary-200 rounded-lg text-sm space-y-2">
              <h4 className="font-semibold text-secondary-900">Resultado de importación</h4>
              <div className="flex gap-4 text-secondary-700">
                {importResult.creados !== undefined && (
                  <span className="text-green-600">✓ Creados: {importResult.creados}</span>
                )}
                {importResult.actualizados !== undefined && (
                  <span className="text-blue-600">↻ Actualizados: {importResult.actualizados}</span>
                )}
                {importResult.errores && importResult.errores.length > 0 && (
                  <span className="text-red-600">✗ Errores: {importResult.errores.length}</span>
                )}
              </div>
              {importResult.errores && importResult.errores.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-red-200 rounded p-2 bg-red-50">
                  {importResult.errores.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">
                      {err.hoja ? `[${err.hoja}] ` : ''}Fila {err.fila}: {err.mensaje || 'Error desconocido'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
