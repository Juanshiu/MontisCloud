'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit, Check, X, Plus, Package } from 'lucide-react';
import { apiService } from '@/services/api';

interface CategoriaProducto {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  cantidadProductos: number;
}

export default function GestionCategorias() {
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditar, setNombreEditar] = useState('');
  const [descripcionEditar, setDescripcionEditar] = useState('');

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const [categoriasData, productosData] = await Promise.all([
        apiService.getCategoriasProductos(),
        apiService.getAllProductos()
      ]);

      // Contar productos por categoría
      const categoriasConConteo = categoriasData.map((categoria: any) => {
        const cantidad = productosData.filter(
          (producto: any) => producto.categoria === categoria.nombre
        ).length;

        return {
          ...categoria,
          cantidadProductos: cantidad
        };
      });

      setCategorias(categoriasConConteo);
      setError(null);
    } catch (err) {
      setError('Error al cargar las categorías');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      setError('El nombre de la categoría es requerido');
      return;
    }

    try {
      await apiService.createCategoriaProducto({
        nombre: nuevaCategoria.trim(),
        descripcion: nuevaDescripcion.trim() || undefined
      });
      await cargarCategorias();
      setNuevaCategoria('');
      setNuevaDescripcion('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar la categoría');
      console.error('Error:', err);
    }
  };

  const iniciarEdicion = (categoria: CategoriaProducto) => {
    setEditandoId(categoria.id);
    setNombreEditar(formatearNombreCategoria(categoria.nombre));
    setDescripcionEditar(categoria.descripcion || '');
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombreEditar('');
    setDescripcionEditar('');
  };

  const guardarEdicion = async () => {
    if (!nombreEditar.trim() || editandoId === null) {
      setError('El nombre de la categoría es requerido');
      return;
    }

    try {
      await apiService.updateCategoriaProducto(editandoId, {
        nombre: nombreEditar.trim(),
        descripcion: descripcionEditar.trim() || undefined
      });

      await cargarCategorias();
      setEditandoId(null);
      setNombreEditar('');
      setDescripcionEditar('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar la categoría');
      console.error('Error:', err);
    }
  };

  const eliminarCategoria = async (categoria: CategoriaProducto) => {
    if (categoria.cantidadProductos > 0) {
      setError(`No se puede eliminar la categoría "${formatearNombreCategoria(categoria.nombre)}" porque tiene ${categoria.cantidadProductos} producto(s) asociado(s)`);
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${formatearNombreCategoria(categoria.nombre)}"?`)) {
      return;
    }

    try {
      await apiService.deleteCategoriaProducto(categoria.id);
      await cargarCategorias();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar la categoría');
      console.error('Error:', err);
    }
  };

  const toggleActivo = async (categoria: CategoriaProducto) => {
    try {
      await apiService.updateCategoriaProducto(categoria.id, {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        activo: !categoria.activo
      });
      await cargarCategorias();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar el estado de la categoría');
      console.error('Error:', err);
    }
  };

  const formatearNombreCategoria = (categoria: string) => {
    return categoria
      .split('_')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-800">Gestión de Categorías</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Formulario para agregar nueva categoría */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center">
          <Plus className="mr-2" size={20} />
          Agregar Nueva Categoría
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Nombre de la categoría (ej: Entradas)"
            className="input-field"
            onKeyPress={(e) => e.key === 'Enter' && agregarCategoria()}
          />
          <input
            type="text"
            value={nuevaDescripcion}
            onChange={(e) => setNuevaDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            className="input-field"
            onKeyPress={(e) => e.key === 'Enter' && agregarCategoria()}
          />
          <button
            onClick={agregarCategoria}
            className="btn-primary flex items-center justify-center"
          >
            <Plus size={18} className="mr-1" />
            Agregar
          </button>
        </div>
      </div>

      {/* Lista de categorías */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
        <h3 className="text-lg font-semibold text-secondary-800 p-4 bg-secondary-50 border-b border-secondary-200">
          Categorías Existentes ({categorias.length})
        </h3>

        <div className="divide-y divide-secondary-200">
          {categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="p-4 hover:bg-secondary-25 transition-colors"
            >
              {editandoId === categoria.id ? (
                /* Modo edición */
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={nombreEditar}
                    onChange={(e) => setNombreEditar(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Nombre"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={descripcionEditar}
                    onChange={(e) => setDescripcionEditar(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Descripción"
                  />
                  <button
                    onClick={guardarEdicion}
                    className="btn-primary px-3 py-2"
                    title="Guardar"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={cancelarEdicion}
                    className="btn-secondary px-3 py-2"
                    title="Cancelar"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                /* Modo visualización */
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-semibold text-secondary-900">
                        {formatearNombreCategoria(categoria.nombre)}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        categoria.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {categoria.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    {categoria.descripcion && (
                      <p className="text-sm text-secondary-600 mt-1">
                        {categoria.descripcion}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-secondary-500 mt-2">
                      <Package size={14} className="mr-1" />
                      {categoria.cantidadProductos} producto{categoria.cantidadProductos !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleActivo(categoria)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        categoria.activo
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={categoria.activo ? 'Desactivar' : 'Activar'}
                    >
                      {categoria.activo ? '👁️ Activa' : '👁️‍🗨️ Inactiva'}
                    </button>
                    <button
                      onClick={() => iniciarEdicion(categoria)}
                      className="btn-secondary px-3 py-2"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => eliminarCategoria(categoria)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                      disabled={categoria.cantidadProductos > 0}
                      title={categoria.cantidadProductos > 0 ? 'No se puede eliminar: tiene productos asociados' : 'Eliminar'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {categorias.length === 0 && (
          <div className="p-8 text-center text-secondary-500">
            <Package size={48} className="mx-auto mb-2 opacity-30" />
            <p>No hay categorías registradas</p>
            <p className="text-sm">Agrega tu primera categoría usando el formulario arriba</p>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Información</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Las categorías inactivas no aparecen en la interfaz de creación de pedidos</li>
          <li>• No puedes eliminar categorías con productos asociados</li>
          <li>• Los nombres se guardan en formato: "entradas", "sopas_y_caldos", etc.</li>
          <li>• Al editar una categoría, todos sus productos se actualizan automáticamente</li>
        </ul>
      </div>
    </div>
  );
}
