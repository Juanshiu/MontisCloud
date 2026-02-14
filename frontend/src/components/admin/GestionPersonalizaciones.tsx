'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { Plus, Edit2, Trash2, Save, X, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

type TipoPersonalizacion = 'categorias' | 'caldos' | 'principios' | 'proteinas' | 'bebidas';

interface PersonalizacionForm {
  nombre: string;
  precio_adicional: number;
  usa_inventario: boolean;
  usa_insumos: boolean;
  cantidad_inicial: number;
  cantidad_actual: number;
}

interface CategoriaForm {
  nombre: string;
  descripcion: string;
  orden: number;
}

export default function GestionPersonalizaciones() {
  const [tipoActivo, setTipoActivo] = useState<TipoPersonalizacion>('categorias');
  const [items, setItems] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [riesgosPersonalizaciones, setRiesgosPersonalizaciones] = useState<Record<string, 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);
  const [formulario, setFormulario] = useState<PersonalizacionForm>({
    nombre: '',
    precio_adicional: 0,
    usa_inventario: false,
    usa_insumos: false,
    cantidad_inicial: 0,
    cantidad_actual: 0
  });
  const [formularioCategoria, setFormularioCategoria] = useState<CategoriaForm>({
    nombre: '',
    descripcion: '',
    orden: 0
  });

  useEffect(() => {
    cargarCategorias();
    cargarRiesgosPersonalizaciones();
  }, []);

  useEffect(() => {
    cargarItems();
  }, [tipoActivo]);

  // Recargar datos cuando la ventana recupera el foco (para actualizar inventario)
  useEffect(() => {
    const handleFocus = () => {
      cargarItems();
      cargarRiesgosPersonalizaciones();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [tipoActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarCategorias = async () => {
    try {
      const response = await apiService.getCategoriasPersonalizacion();
      setCategorias(response || []);
      
      // Construir tabs dinámicamente
      const tiposDinamicos = [
        { id: 'categorias' as TipoPersonalizacion, label: 'Categorías', descripcion: 'Gestionar tipos de personalización', categoriaId: null }
      ];
      
      // Agregar tabs para cada categoría activa
      response.forEach((cat: any) => {
        if (cat.activo) {
          tiposDinamicos.push({
            id: cat.id.toString() as TipoPersonalizacion,
            label: cat.nombre,
            descripcion: cat.descripcion || '',
            categoriaId: cat.id
          } as any);
        }
      });
      
      setTipos(tiposDinamicos);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarItems = async () => {
    try {
      setLoading(true);
      let response;
      
      if (tipoActivo === 'categorias') {
        response = await apiService.getCategoriasPersonalizacion();
        setCategorias(response || []);
        setItems([]);
      } else {
        // Buscar el ID de la categoría por el tipoActivo
        const tipoEncontrado = tipos.find(t => t.id === tipoActivo);
        if (tipoEncontrado && tipoEncontrado.categoriaId) {
          response = await apiService.getItemsPersonalizacion(tipoEncontrado.categoriaId);
          setItems(response || []);
        } else {
          setItems([]);
        }
      }
      
      setError(null);
      await cargarRiesgosPersonalizaciones();
    } catch (err) {
      setError(`Error al cargar ${tipoActivo}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarRiesgosPersonalizaciones = async () => {
    try {
      const response = await apiService.getRiesgoPersonalizaciones();
      const mapa: Record<string, 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO'> = {};
      response.forEach((item: any) => {
        mapa[item.item_personalizacion_id] = item.estado;
      });
      setRiesgosPersonalizaciones(mapa);
    } catch (err) {
      console.error('Error al cargar riesgos de personalizaciones:', err);
    }
  };

  const iniciarCreacion = () => {
    setCreandoNuevo(true);
    setEditandoId(null);
    setFormulario({
      nombre: '',
      precio_adicional: 0,
      usa_inventario: false,
      usa_insumos: false,
      cantidad_inicial: 0,
      cantidad_actual: 0
    });
  };

  const iniciarEdicion = (item: any) => {
    setEditandoId(item.id);
    setCreandoNuevo(false);
    setFormulario({
      nombre: item.nombre,
      precio_adicional: item.precio_adicional,
      usa_inventario: Boolean(item.usa_inventario),
      usa_insumos: Boolean(item.usa_insumos),
      cantidad_inicial: item.cantidad_inicial || 0,
      cantidad_actual: item.cantidad_actual || 0
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setCreandoNuevo(false);
    setFormulario({
      nombre: '',
      precio_adicional: 0,
      usa_inventario: false,
      usa_insumos: false,
      cantidad_inicial: 0,
      cantidad_actual: 0
    });
  };

  const guardarItem = async () => {
    if (!formulario.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (formulario.precio_adicional < 0) {
      setError('El precio adicional debe ser mayor o igual a 0');
      return;
    }

    // Validar inventario si está habilitado
    if (formulario.usa_inventario) {
      if (creandoNuevo && (!formulario.cantidad_inicial || formulario.cantidad_inicial < 0)) {
        setError('Debe especificar una cantidad inicial válida cuando usa inventario');
        return;
      }
      if (!creandoNuevo && formulario.cantidad_actual < 0) {
        setError('La cantidad actual debe ser mayor o igual a 0');
        return;
      }
    }

    try {
      setError(null);
      const tipoEncontrado = tipos.find(t => t.id === tipoActivo);
      if (!tipoEncontrado || !tipoEncontrado.categoriaId) {
        setError('No se pudo identificar la categoría');
        return;
      }
      
      const itemData = {
        nombre: formulario.nombre,
        precio_adicional: formulario.precio_adicional,
        usa_inventario: formulario.usa_inventario,
        usa_insumos: formulario.usa_insumos,
        cantidad_inicial: formulario.usa_inventario ? formulario.cantidad_inicial : null,
        cantidad_actual: formulario.usa_inventario ? (creandoNuevo ? formulario.cantidad_inicial : formulario.cantidad_actual) : null
      };
      
      if (creandoNuevo) {
        await apiService.createItemPersonalizacion(tipoEncontrado.categoriaId, itemData);
      } else if (editandoId) {
        await apiService.updateItemPersonalizacion(tipoEncontrado.categoriaId, editandoId, itemData);
      }

      await cargarItems();
      cancelarEdicion();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar el item');
      console.error('Error:', err);
    }
  };

  const eliminarItem = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este item?')) {
      return;
    }

    try {
      const tipoEncontrado = tipos.find(t => t.id === tipoActivo);
      if (!tipoEncontrado || !tipoEncontrado.categoriaId) {
        setError('No se pudo identificar la categoría');
        return;
      }
      await apiService.deleteItemPersonalizacion(tipoEncontrado.categoriaId, id);
      await cargarItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar el item');
      console.error('Error:', err);
    }
  };

  // Funciones para manejar categorías
  const iniciarCreacionCategoria = () => {
    setCreandoNuevo(true);
    setEditandoId(null);
    setFormularioCategoria({
      nombre: '',
      descripcion: '',
      orden: categorias.length
    });
  };

  const iniciarEdicionCategoria = (categoria: any) => {
    setEditandoId(categoria.id);
    setCreandoNuevo(false);
    setFormularioCategoria({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      orden: categoria.orden
    });
  };

  const cancelarEdicionCategoria = () => {
    setEditandoId(null);
    setCreandoNuevo(false);
    setFormularioCategoria({
      nombre: '',
      descripcion: '',
      orden: 0
    });
  };

  const guardarCategoria = async () => {
    if (!formularioCategoria.nombre.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    // Validar que el nombre no exista (solo al crear)
    if (creandoNuevo) {
      const nombreExiste = categorias.some(
        cat => cat.nombre.toLowerCase() === formularioCategoria.nombre.trim().toLowerCase()
      );
      if (nombreExiste) {
        setError(`Ya existe una categoría con el nombre "${formularioCategoria.nombre}". Por favor usa un nombre diferente.`);
        return;
      }
    } else if (editandoId) {
      // Al editar, validar que no exista otro con el mismo nombre
      const nombreExiste = categorias.some(
        cat => cat.nombre.toLowerCase() === formularioCategoria.nombre.trim().toLowerCase() && cat.id !== editandoId
      );
      if (nombreExiste) {
        setError(`Ya existe otra categoría con el nombre "${formularioCategoria.nombre}". Por favor usa un nombre diferente.`);
        return;
      }
    }

    try {
      setError(null);
      
      if (creandoNuevo) {
        await apiService.createCategoriaPersonalizacion(formularioCategoria);
      } else if (editandoId) {
        await apiService.updateCategoriaPersonalizacion(editandoId, {
          ...formularioCategoria,
          activo: true
        });
      }

      await cargarCategorias();
      await cargarItems();
      cancelarEdicionCategoria();
    } catch (err: any) {
      if (err.response?.data?.detalles?.includes('UNIQUE constraint')) {
        setError(`El nombre "${formularioCategoria.nombre}" ya está en uso. Por favor elige otro nombre.`);
      } else {
        setError('Error al guardar la categoría: ' + (err.response?.data?.error || err.message || 'Error desconocido'));
      }
      console.error('Error:', err);
    }
  };

  const eliminarCategoria = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría? También se eliminarán los ítems de personalización asociados a esta categoría.')) {
      return;
    }

    try {
      await apiService.deleteCategoriaPersonalizacion(id);
      await cargarCategorias();
      await cargarItems();
    } catch (err) {
      setError('Error al eliminar la categoría');
      console.error('Error:', err);
    }
  };

  const cambiarDisponibilidad = async (itemId: string, disponibleActual: boolean) => {
    try {
      const tipoEncontrado = tipos.find(t => t.id === tipoActivo);
      if (!tipoEncontrado || !tipoEncontrado.categoriaId) {
        setError('No se pudo identificar la categoría');
        return;
      }

      const nuevoEstado = !disponibleActual;
      await apiService.updateDisponibilidadItem(tipoEncontrado.categoriaId, itemId, nuevoEstado);
      
      // Actualizar la lista local - convertir booleano a número (0 o 1)
      setItems(items.map(item => 
        item.id === itemId ? { ...item, disponible: nuevoEstado ? 1 : 0 } : item
      ));

      // Obtener el item para el mensaje
      const item = items.find(i => i.id === itemId);
      const mensaje = `"${item?.nombre}" ahora está ${nuevoEstado ? 'DISPONIBLE' : 'NO DISPONIBLE'}`;
      
      // Mostrar notificación local
      setNotificacion({
        tipo: 'success',
        mensaje: mensaje
      });

      // Guardar notificación en localStorage para otras páginas
      localStorage.setItem('personalizacion_notification', JSON.stringify({
        tipo: 'success',
        mensaje: mensaje
      }));

      // Ocultar notificación después de 3 segundos
      setTimeout(() => {
        setNotificacion(null);
      }, 3000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar disponibilidad');
      console.error('Error:', err);
    }
  };

  const tipoActual = tipos.find(t => t.id === tipoActivo);

  return (
    <div className="space-y-6">
      {/* Notificación Toast */}
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in ${
          notificacion.tipo === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notificacion.tipo === 'success' ? (
            <CheckCircle2 size={24} className="flex-shrink-0" />
          ) : (
            <XCircle size={24} className="flex-shrink-0" />
          )}
          <p className="font-medium">{notificacion.mensaje}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-800 mb-2">Gestión de Personalizaciones</h2>
        <p className="text-secondary-600">
          Administra las opciones de personalización para almuerzos y desayunos
        </p>
      </div>

      {/* Pestañas */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tipos.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setTipoActivo(tipo.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${tipoActivo === tipo.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }
              `}
            >
              {tipo.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Info del tipo actual */}
      {tipoActual && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            <strong>{tipoActual.label}:</strong> {tipoActual.descripcion}
          </p>
        </div>
      )}

      {/* Botón crear */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-secondary-800">
          {tipoActual?.label} ({tipoActivo === 'categorias' ? categorias.length : items.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              cargarItems();
              cargarRiesgosPersonalizaciones();
            }}
            className="btn-secondary flex items-center"
            title="Actualizar inventario"
          >
            <RefreshCw size={16} className="mr-2" />
            Actualizar
          </button>
          <button
            onClick={tipoActivo === 'categorias' ? iniciarCreacionCategoria : iniciarCreacion}
            className="btn-primary flex items-center"
            disabled={creandoNuevo || editandoId !== null}
          >
            <Plus size={16} className="mr-2" />
            {tipoActivo === 'categorias' ? 'Agregar Categoría' : `Agregar ${tipoActual?.label?.slice(0, -1) || 'Item'}`}
          </button>
        </div>
      </div>

      {/* Formulario de creación/edición */}
      {(creandoNuevo || editandoId !== null) && tipoActivo === 'categorias' && (
        <div className="card">
          <h4 className="text-lg font-semibold text-secondary-800 mb-4">
            {creandoNuevo ? 'Agregar Categoría' : 'Editar Categoría'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formularioCategoria.nombre}
                onChange={(e) => setFormularioCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                className="input-field"
                placeholder="Ej: Carnes, Guarniciones, Salsas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Orden
              </label>
              <input
                type="number"
                value={formularioCategoria.orden}
                onChange={(e) => setFormularioCategoria(prev => ({ ...prev, orden: Number(e.target.value) }))}
                className="input-field"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formularioCategoria.descripcion}
                onChange={(e) => setFormularioCategoria(prev => ({ ...prev, descripcion: e.target.value }))}
                className="input-field"
                rows={2}
                placeholder="Descripción opcional de la categoría"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelarEdicionCategoria}
              className="btn-secondary flex items-center"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </button>
            <button
              onClick={guardarCategoria}
              className="btn-primary flex items-center"
            >
              <Save size={16} className="mr-2" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de creación/edición para personalizaciones */}
      {(creandoNuevo || editandoId !== null) && tipoActivo !== 'categorias' && (
        <div className="card">
          <h4 className="text-lg font-semibold text-secondary-800 mb-4">
            {creandoNuevo ? `Agregar ${tipoActual?.label.slice(0, -1)}` : `Editar ${tipoActual?.label.slice(0, -1)}`}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formulario.nombre}
                onChange={(e) => setFormulario(prev => ({ ...prev, nombre: e.target.value }))}
                className="input-field"
                placeholder={`Nombre del ${tipoActual?.label.slice(0, -1).toLowerCase()}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Precio Adicional
              </label>
              <input
                type="number"
                value={formulario.precio_adicional}
                onChange={(e) => setFormulario(prev => ({ ...prev, precio_adicional: Number(e.target.value) }))}
                className="input-field"
                placeholder="0"
                min="0"
                step="500"
              />
            </div>
          </div>

          {/* Inventario Avanzado (Insumos) */}
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="usa_insumos"
                checked={formulario.usa_insumos}
                onChange={(e) => setFormulario(prev => ({
                  ...prev,
                  usa_insumos: e.target.checked
                }))}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="usa_insumos" className="ml-2 text-sm font-medium text-secondary-700">
                Usar insumos (ajustes de receta)
              </label>
            </div>
            <p className="text-xs text-secondary-500 ml-6">
              Si está activo, los ajustes de insumos de esta personalización se aplicarán al confirmar la comanda.
            </p>
          </div>

          {/* Sistema de Inventario */}
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="usa_inventario"
                checked={formulario.usa_inventario}
                onChange={(e) => setFormulario(prev => ({ 
                  ...prev, 
                  usa_inventario: e.target.checked,
                  // Si se desactiva el inventario, resetear cantidades
                  cantidad_inicial: e.target.checked ? prev.cantidad_inicial : 0,
                  cantidad_actual: e.target.checked ? prev.cantidad_actual : 0
                }))}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="usa_inventario" className="ml-2 text-sm font-medium text-secondary-700">
                📊 Activar control de inventario
              </label>
            </div>

            {formulario.usa_inventario && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                {creandoNuevo ? (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Cantidad Inicial *
                    </label>
                    <input
                      type="number"
                      value={formulario.cantidad_inicial}
                      onChange={(e) => setFormulario(prev => ({ 
                        ...prev, 
                        cantidad_inicial: Number(e.target.value)
                      }))}
                      className="input-field"
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Cantidad con la que inicia este item
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Cantidad Inicial
                      </label>
                      <input
                        type="number"
                        value={formulario.cantidad_inicial}
                        onChange={(e) => setFormulario(prev => ({ 
                          ...prev, 
                          cantidad_inicial: Number(e.target.value)
                        }))}
                        className="input-field"
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Cantidad de referencia
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Cantidad Actual *
                      </label>
                      <input
                        type="number"
                        value={formulario.cantidad_actual}
                        onChange={(e) => setFormulario(prev => ({ 
                          ...prev, 
                          cantidad_actual: Number(e.target.value)
                        }))}
                        className="input-field"
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Cantidad disponible actualmente
                      </p>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-xs text-yellow-800">
                      ⚠️ <strong>Nota:</strong> Cuando la cantidad actual llegue a 0, el item se marcará automáticamente como "No disponible"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelarEdicion}
              className="btn-secondary flex items-center"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </button>
            <button
              onClick={guardarItem}
              className="btn-primary flex items-center"
            >
              <Save size={16} className="mr-2" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Lista de categorías */}
      {tipoActivo === 'categorias' && (
        <div className="card">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-secondary-600 text-center py-8">
              No hay categorías de personalización registradas
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {categorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">
                          {categoria.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-secondary-600">
                          {categoria.descripcion || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">
                          {categoria.orden}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => iniciarEdicionCategoria(categoria)}
                            disabled={creandoNuevo || editandoId !== null}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => eliminarCategoria(categoria.id)}
                            disabled={creandoNuevo || editandoId !== null}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lista de items de personalización */}
      {tipoActivo !== 'categorias' && (
        <div className="card">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-secondary-600 text-center py-8">
              No hay {tipoActual?.label.toLowerCase()} registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Precio Adicional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Inventario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Usa insumos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Riesgo insumos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Disponibilidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {items.map((item) => {
                    const usaInventario = Boolean(item.usa_inventario);
                    const cantidadActual = item.cantidad_actual;
                    const sinInventario = usaInventario && (cantidadActual === null || cantidadActual <= 0);
                    
                    return (
                      <tr key={item.id} className={item.disponible === 0 || sinInventario ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${item.disponible === 0 || sinInventario ? 'text-gray-400 line-through' : 'text-secondary-900'}`}>
                            {item.nombre}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${item.disponible === 0 || sinInventario ? 'text-gray-400' : 'text-secondary-900'}`}>
                            {item.precio_adicional > 0 
                              ? `+$${item.precio_adicional.toLocaleString()}`
                              : 'Sin costo adicional'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {usaInventario ? (
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-medium ${
                                cantidadActual === null || cantidadActual <= 0 ? 'text-red-600' :
                                cantidadActual <= 5 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                📦 {cantidadActual || 0} unidades
                              </span>
                              {cantidadActual !== null && cantidadActual <= 5 && cantidadActual > 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  ⚠️ Bajo
                                </span>
                              )}
                              {(cantidadActual === null || cantidadActual <= 0) && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  ❌ Agotado
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin control</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {Boolean(item.usa_insumos) ? (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              ✅ Activo
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {riesgosPersonalizaciones[item.id] ? (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                riesgosPersonalizaciones[item.id] === 'AGOTADO'
                                  ? 'bg-red-600 text-white font-bold shadow-sm'
                                  : riesgosPersonalizaciones[item.id] === 'CRITICO'
                                    ? 'bg-red-100 text-red-700'
                                    : riesgosPersonalizaciones[item.id] === 'BAJO'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {riesgosPersonalizaciones[item.id]}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => cambiarDisponibilidad(item.id, item.disponible === 1)}
                            disabled={creandoNuevo || editandoId !== null || sinInventario}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
                              item.disponible === 1 && !sinInventario
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                            title={sinInventario ? 'Sin inventario - no se puede activar' : ''}
                          >
                            {item.disponible === 1 && !sinInventario ? (
                              <>
                                <CheckCircle2 size={16} />
                                <span>Disponible</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={16} />
                                <span>{sinInventario ? 'Sin stock' : 'No disponible'}</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => iniciarEdicion(item)}
                              disabled={creandoNuevo || editandoId !== null}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              title="Editar (puedes reponer inventario aquí)"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => eliminarItem(item.id)}
                              disabled={creandoNuevo || editandoId !== null}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
