'use client';

import { useState, useEffect } from 'react';
import { Producto, ItemComanda, PersonalizacionItem, ConfiguracionSistema } from '@/types';
import { apiService } from '@/services/api';
import { Plus, Minus, Trash2, Settings, AlertCircle } from 'lucide-react';
import { getPersonalizacionPorCategoria } from '@/utils/personalizacionUtils';
import PersonalizacionProducto from './PersonalizacionProducto';
import PersonalizacionDisplay from './shared/PersonalizacionDisplay';
import { getInventoryStatus, INVENTORY_COLORS } from '@/constants/inventory';
interface SeleccionProductosProps {
  categoria: string;
  items: ItemComanda[];
  onItemsChange: (items: ItemComanda[]) => void;
}

interface CategoriaPersonalizacion {
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
}

export default function SeleccionProductos({ categoria, items, onItemsChange }: SeleccionProductosProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemPersonalizando, setItemPersonalizando] = useState<string | null>(null);
  const [categoriasPersonalizacion, setCategoriasPersonalizacion] = useState<CategoriaPersonalizacion[]>([]);
  const [itemEliminando, setItemEliminando] = useState<{ id: string; nombre: string } | null>(null);
  const [riesgosProductos, setRiesgosProductos] = useState<Record<string, 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO'>>({});
  const [configSistema, setConfigSistema] = useState<ConfiguracionSistema | null>(null);

  useEffect(() => {
    cargarProductos();
    cargarCategoriasPersonalizacion();
    cargarRiesgosProductos();
    cargarConfiguracion();
  }, [categoria]);

  const cargarConfiguracion = async () => {
    try {
      const config = await apiService.getConfiguracionSistema();
      setConfigSistema(config);
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    }
  };

  const cargarCategoriasPersonalizacion = async () => {
    try {
      const categorias = await apiService.getCategoriasPersonalizacion();
      setCategoriasPersonalizacion(
        categorias
          .filter((c: CategoriaPersonalizacion) => c.activo)
          .sort((a: CategoriaPersonalizacion, b: CategoriaPersonalizacion) => a.orden - b.orden)
      );
    } catch (err) {
      console.error('Error al cargar categorías de personalización:', err);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const productosData = await apiService.getProductosByCategoria(categoria);
      setProductos(productosData);
      setError(null);
    } catch (err) {
      setError('Error al cargar los productos');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarRiesgosProductos = async () => {
    try {
      const response = await apiService.getRiesgoProductos();
      const mapa: Record<string, 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO'> = {};
      response.forEach((item: any) => {
        mapa[item.producto_id] = item.estado;
      });
      setRiesgosProductos(mapa);
    } catch (err) {
      console.error('Error al cargar riesgos de productos:', err);
    }
  };

  const obtenerPersonalizacionesFormateadas = async (personalizacion: PersonalizacionItem): Promise<string[]> => {
    if (!personalizacion || Object.keys(personalizacion).length === 0) return [];
    
    const resultado: string[] = [];
    
    try {
      // Obtener todas las categorías y ordenarlas
      const categorias = await apiService.getCategoriasPersonalizacion();
      const categoriasOrdenadas = categorias.sort((a: any, b: any) => a.orden - b.orden);
      
      // Ordenar las entradas de personalización según el orden de las categorías
      const entradasOrdenadas = Object.entries(personalizacion)
        .filter(([key]) => key !== 'precio_adicional')
        .sort(([catIdA], [catIdB]) => {
          const catA = categoriasOrdenadas.find((c: any) => c.id === catIdA);
          const catB = categoriasOrdenadas.find((c: any) => c.id === catIdB);
          return (catA?.orden || 999) - (catB?.orden || 999);
        });
      
      // Para cada categoría ID en la personalización (ya ordenadas)
      for (const [categoriaId, itemId] of entradasOrdenadas) {
        const catId = categoriaId;
        const categoria = categoriasOrdenadas.find((c: any) => c.id === catId);
        
        if (categoria) {
          // Obtener los items de esta categoría
          const items = await apiService.getItemsPersonalizacion(catId);
          const item = items.find((i: any) => i.id === itemId);
          
          if (item) {
            resultado.push(`${categoria.nombre}: ${item.nombre}`);
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener personalizaciones formateadas:', error);
    }
    
    return resultado;
  };

  const agregarProducto = (producto: Producto) => {
    // Para productos con personalización, siempre crear items separados para permitir personalizaciones únicas
    if (esPersonalizable(producto)) {
      // Buscar el producto completo desde el estado productos para asegurar que tenga todas las propiedades
      const productoCompleto = productos.find(p => p.id === producto.id) || producto;
      
      const nuevoItem: ItemComanda = {
        id: `item_${Date.now()}_${Math.random()}_${producto.id}`,
        producto: productoCompleto,
        cantidad: 1,
        precio_unitario: productoCompleto.precio,
        subtotal: productoCompleto.precio,
        observaciones: ''
      };
      onItemsChange([...items, nuevoItem]);
      return;
    }

    // Para otros productos, mantener la lógica original de sumar cantidades
    const itemExistente = items.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      const nuevosItems = items.map(item =>
        item.producto.id === producto.id
          ? {
              ...item,
              cantidad: item.cantidad + 1,
              subtotal: calcularSubtotalConPersonalizacion(item.cantidad + 1, item.precio_unitario, item.personalizacion)
            }
          : item
      );
      onItemsChange(nuevosItems);
    } else {
      const nuevoItem: ItemComanda = {
        id: `item_${Date.now()}_${producto.id}`,
        producto,
        cantidad: 1,
        precio_unitario: producto.precio,
        subtotal: producto.precio,
        observaciones: ''
      };
      onItemsChange([...items, nuevoItem]);
    }
  };

  const calcularSubtotalConPersonalizacion = (cantidad: number, precioUnitario: number, personalizacion?: PersonalizacionItem): number => {
    const precioBase = cantidad * precioUnitario;
    const precioAdicional = personalizacion?.precio_adicional || 0;
    return precioBase + (cantidad * precioAdicional);
  };

  const quitarProducto = (itemIdOProductoId: string) => {
    // Si el id contiene un guión o es largo, probamos si es un itemId de la comanda
    const itemEnComanda = items.find(i => i.id === itemIdOProductoId);
    
    if (itemEnComanda) {
      const item = itemEnComanda;
      
      // Si el producto es personalizable, siempre eliminar el item completo (pedir confirmación)
      if (esPersonalizable(item.producto)) {
        solicitarConfirmacionEliminar(itemIdOProductoId);
        return;
      }
      
      // Para productos acumulables (no personalizables), restar 1 si hay más de 1
      if (item.cantidad > 1) {
        const nuevosItems = items.map(i =>
          i.id === itemIdOProductoId
            ? {
                ...i,
                cantidad: i.cantidad - 1,
                subtotal: calcularSubtotalConPersonalizacion(i.cantidad - 1, i.precio_unitario, i.personalizacion)
              }
            : i
        );
        onItemsChange(nuevosItems);
      } else {
        // Si solo queda 1, pedir confirmación para eliminar
        solicitarConfirmacionEliminar(itemIdOProductoId);
      }
      return;
    }
    
    const productoId = itemIdOProductoId;
    const producto = productos.find(p => p.id === productoId);
    
    // Para productos personalizables, eliminar el último item agregado de ese producto
    if (producto && esPersonalizable(producto)) {
      const itemsDeEsteProducto = items.filter(item => item.producto.id === productoId);
      if (itemsDeEsteProducto.length > 0) {
        // Eliminar el último item agregado
        const ultimoItem = itemsDeEsteProducto[itemsDeEsteProducto.length - 1];
        solicitarConfirmacionEliminar(ultimoItem.id);
      }
      return;
    }

    // Para otros productos, mantener la lógica original de restar cantidad
    const itemExistente = items.find(item => item.producto.id === productoId);
    
    if (itemExistente && itemExistente.cantidad > 1) {
      const nuevosItems = items.map(item =>
        item.producto.id === productoId
          ? {
              ...item,
              cantidad: item.cantidad - 1,
              subtotal: calcularSubtotalConPersonalizacion(item.cantidad - 1, item.precio_unitario, item.personalizacion)
            }
          : item
      );
      onItemsChange(nuevosItems);
    } else if (itemExistente) {
      solicitarConfirmacionEliminar(itemExistente.id);
    }
  };

  const solicitarConfirmacionEliminar = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setItemEliminando({ id: itemId, nombre: item.producto.nombre });
    }
  };

  const confirmarEliminarItem = () => {
    if (itemEliminando) {
      // Eliminar el item específico por su id único, no por producto.id
      const nuevosItems = items.filter(item => item.id !== itemEliminando.id);
      onItemsChange(nuevosItems);
      setItemEliminando(null);
    }
  };

  const cancelarEliminarItem = () => {
    setItemEliminando(null);
  };

  const eliminarTodosLosItemsDeProducto = (productoId: string) => {
    // Eliminar todos los items de un producto específico (usado en Productos Disponibles)
    const nuevosItems = items.filter(item => item.producto.id !== productoId);
    onItemsChange(nuevosItems);
  };

  const personalizarItem = (itemId: string) => {
    setItemPersonalizando(itemId);
  };

  const guardarPersonalizacion = (itemId: string, personalizacion: PersonalizacionItem) => {
    const nuevosItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          personalizacion,
          subtotal: calcularSubtotalConPersonalizacion(item.cantidad, item.precio_unitario, personalizacion)
        };
      }
      return item;
    });
    onItemsChange(nuevosItems);
    setItemPersonalizando(null);
  };

  const esPersonalizable = (producto: Producto): boolean => {
    // Un producto es personalizable si tiene el flag activado O si es desayuno/almuerzo (legacy)
    return producto.tiene_personalizacion === true || producto.categoria === 'desayuno' || producto.categoria === 'almuerzo';
  };

  const actualizarObservaciones = (itemId: string, observaciones: string) => {
    const nuevosItems = items.map(item =>
      item.id === itemId
        ? { ...item, observaciones }
        : item
    );
    onItemsChange(nuevosItems);
  };

  const obtenerCantidadProducto = (productoId: string): number => {
    // Para productos con personalización, contar todos los items con ese producto (no sumar cantidades)
    const producto = productos.find(p => p.id === productoId);
    if (producto && esPersonalizable(producto)) {
      return items.filter(item => item.producto.id === productoId).length;
    }
    
    // Para otros productos, sumar las cantidades
    const item = items.find(item => item.producto.id === productoId);
    return item ? item.cantidad : 0;
  };

  const calcularTotal = (): number => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Productos</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Productos</h2>
        <div className="text-red-600 text-center py-4">
          {error}
          <button 
            onClick={cargarProductos}
            className="block mx-auto mt-2 btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de productos */}
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Productos Disponibles</h2>
        
        {productos.length === 0 ? (
          <p className="text-secondary-600 text-center py-4">
            No hay productos disponibles para esta categoría
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((producto) => {
              const cantidad = obtenerCantidadProducto(producto.id);
              const inventoryStatus = producto.usa_inventario 
                ? getInventoryStatus(producto.cantidad_actual, producto.cantidad_inicial)
                : null;
              const riesgoInsumos = producto.usa_insumos ? riesgosProductos[producto.id] : null;
              
              // Bloqueo por inventario físico (usa_inventario):
              // Solo DEPLETED (0 unidades) bloquea — CRITICAL/LOW son avisos informativos
              const bloqueadoPorInventarioFisico = inventoryStatus === 'DEPLETED';
              
              // Bloqueo por insumos (usa_insumos):
              // AGOTADO siempre bloquea (porque físicamente no hay insumos suficientes para 1 unidad)
              // CRITICO/BAJO bloquean según la configuración del sistema
              const bloqueadoPorInsumos = 
                riesgoInsumos === 'AGOTADO' ||
                (configSistema?.critico_modo === 'CRITICO' && riesgoInsumos === 'CRITICO') ||
                (configSistema?.critico_modo === 'BAJO' && (riesgoInsumos === 'CRITICO' || riesgoInsumos === 'BAJO'));

              const inventarioInsuficiente = bloqueadoPorInventarioFisico || bloqueadoPorInsumos;
              
              const inventarioBajo = inventoryStatus === 'LOW' || inventoryStatus === 'CRITICAL';
              const avisoSoloInformativo = !bloqueadoPorInsumos && (riesgoInsumos === 'CRITICO' || riesgoInsumos === 'BAJO');
              
              return (
                <div key={producto.id} className="border border-secondary-200 rounded-lg p-4 bg-white">
                  <div className="mb-3">
                    <h3 className="font-semibold text-secondary-800 mb-1 flex items-center flex-wrap gap-1">
                      {producto.nombre}
                      {bloqueadoPorInventarioFisico && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">
                          Agotado
                        </span>
                      )}
                      {bloqueadoPorInsumos && !bloqueadoPorInventarioFisico && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          {String(riesgoInsumos) === 'AGOTADO' ? 'Insumos Agotados' : 'Faltan insumos'}
                        </span>
                      )}
                      {avisoSoloInformativo && !bloqueadoPorInsumos && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle size={12} /> Insumos en riesgo
                        </span>
                      )}
                      {inventarioBajo && !inventarioInsuficiente && !avisoSoloInformativo && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Bajo stock
                        </span>
                      )}
                    </h3>
                    {producto.descripcion && (
                      <p className="text-sm text-secondary-600 mb-2 break-words">
                        {producto.descripcion}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary-600">
                      ${producto.precio.toLocaleString()}
                    </p>
                    {producto.usa_inventario && producto.cantidad_actual !== null && (
                      <p className="text-xs text-secondary-500 mt-1">
                        Stock: {producto.cantidad_actual} unidades
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => quitarProducto(producto.id)}
                        disabled={cantidad === 0}
                        className="w-8 h-8 rounded-full bg-secondary-200 hover:bg-secondary-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <Minus size={16} />
                      </button>
                      
                      <span className="w-8 text-center font-semibold">
                        {cantidad}
                      </span>
                      
                      <button
                        onClick={() => agregarProducto(producto)}
                        disabled={!producto.disponible || inventarioInsuficiente}
                        className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center"
                        title={inventarioInsuficiente ? 'Sin inventario disponible' : (!producto.disponible ? 'Producto no disponible' : 'Agregar producto')}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    {cantidad > 0 && (
                      <button
                        onClick={() => eliminarTodosLosItemsDeProducto(producto.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen de items seleccionados */}
      {items.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">
            Items Seleccionados ({items.length})
          </h3>
          
          {/* Leyenda de colores si hay items adicionales */}
          {items.some(item => item.id.startsWith('temp_') || item.id.startsWith('item_')) && items.some(item => !item.id.startsWith('temp_') && !item.id.startsWith('item_')) && (
            <div className="mb-4 flex gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
                <span className="text-secondary-600">Items originales</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
                <span className="text-secondary-600">Items adicionales</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {items.map((item) => {
              const esItemAdicional = item.id.startsWith('temp_') || item.id.startsWith('item_');
              return (
              <div 
                key={item.id} 
                className={`p-3 rounded-lg border-2 ${
                  esItemAdicional 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-green-400 bg-green-50'
                }`}
              >
                {/* Primera fila: Información y botones */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-secondary-800">
                      <span>{item.producto.nombre} x {item.cantidad}</span>
                      {esItemAdicional && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-0.5 rounded">
                          NUEVO
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-secondary-600">
                      ${item.precio_unitario.toLocaleString()} c/u
                      {item.personalizacion?.precio_adicional && item.personalizacion.precio_adicional > 0 && (
                        <span className="text-primary-600">
                          {' '}+ ${item.personalizacion.precio_adicional.toLocaleString()} personalización
                        </span>
                      )}
                      {' '}= ${item.subtotal.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    {esPersonalizable(item.producto) && (
                      <button
                        onClick={() => personalizarItem(item.id)}
                        className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                        title="Personalizar"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => quitarProducto(item.id)}
                      className="w-8 h-8 rounded-full bg-secondary-200 hover:bg-secondary-300 flex items-center justify-center"
                    >
                      <Minus size={16} />
                    </button>
                    
                    <span className="w-8 text-center font-semibold">
                      {item.cantidad}
                    </span>
                    
                    <button
                      onClick={() => agregarProducto(item.producto)}
                      className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                    
                    <button
                      onClick={() => solicitarConfirmacionEliminar(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 ml-2"
                      title="Eliminar item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Segunda fila: Personalización - ahora ocupa todo el ancho */}
                {item.personalizacion && Object.keys(item.personalizacion).filter(k => k !== 'precio_adicional').length > 0 && (
                  <div className="mb-2 p-2 bg-white rounded border border-blue-200">
                    <div className="text-xs font-semibold text-blue-700 mb-1">🔹 PERSONALIZACIÓN</div>
                    <PersonalizacionDisplay personalizacion={item.personalizacion} />
                  </div>
                )}
                
                {/* Tercera fila: Observaciones */}
                <div>
                  <input
                    type="text"
                    placeholder="Observaciones para este item..."
                    value={item.observaciones || ''}
                    onChange={(e) => actualizarObservaciones(item.id, e.target.value)}
                    className="w-full text-sm input-field"
                  />
                </div>
              </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-secondary-800">Total:</span>
              <span className="text-xl font-bold text-primary-600">
                ${calcularTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de personalización */}
      {itemPersonalizando && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Cerrar modal al hacer click fuera del contenido
            if (e.target === e.currentTarget) {
              setItemPersonalizando(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Evitar que se cierre al hacer click dentro
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-secondary-800">
                Personalizar Producto
              </h3>
              <button
                onClick={() => setItemPersonalizando(null)}
                className="text-secondary-400 hover:text-secondary-600 p-1"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const item = items.find(i => i.id === itemPersonalizando);
              if (!item) return null;
              
              // Usar el mismo componente para TODOS los productos
              return (
                <div>
                  <PersonalizacionProducto
                    producto={item.producto}
                    onPersonalizacionChange={(personalizacion: PersonalizacionItem) => {
                      // Actualizar temporalmente sin cerrar el modal
                      const nuevosItems = items.map(i => {
                        if (i.id === itemPersonalizando) {
                          return {
                            ...i,
                            personalizacion,
                            subtotal: calcularSubtotalConPersonalizacion(i.cantidad, i.precio_unitario, personalizacion)
                          };
                        }
                        return i;
                      });
                      onItemsChange(nuevosItems);
                    }}
                    personalizacionInicial={item.personalizacion}
                  />
                  <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setItemPersonalizando(null)}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Salir
                    </button>
                    <button
                      onClick={() => setItemPersonalizando(null)}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Diálogo de confirmación de eliminación */}
      {itemEliminando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-secondary-800 mb-2">
                  ¿Eliminar item?
                </h3>
                <p className="text-secondary-600 text-sm mb-1">
                  Está a punto de eliminar el siguiente producto:
                </p>
                <p className="font-medium text-secondary-800">
                  {itemEliminando.nombre}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelarEliminarItem}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarItem}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
