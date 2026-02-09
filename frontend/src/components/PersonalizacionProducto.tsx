'use client';

import { useState, useEffect } from 'react';
import { PersonalizacionItem, Producto, ItemPersonalizacion, ConfiguracionSistema } from '@/types';
import { apiService } from '@/services/api';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface CategoriaConItems {
  id: string;
  nombre: string;
  items: ItemPersonalizacion[];
}

interface PersonalizacionProductoProps {
  producto?: Producto;
  onPersonalizacionChange: (personalizacion: PersonalizacionItem) => void;
  personalizacionInicial?: PersonalizacionItem;
}

export default function PersonalizacionProducto({ producto, onPersonalizacionChange, personalizacionInicial }: PersonalizacionProductoProps) {
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionItem>(
    personalizacionInicial || {}
  );
  const [categoriasConItems, setCategoriasConItems] = useState<CategoriaConItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);

  useEffect(() => {
    cargarOpcionesDinamicas();
  }, [producto]);

  useEffect(() => {
    // Listener para notificaciones de cambios de disponibilidad
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'personalizacion_notification') {
        const data = JSON.parse(e.newValue || '{}');
        setNotificacion(data);
        
        // Recargar las opciones para actualizar disponibilidad
        cargarOpcionesDinamicas();
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setNotificacion(null);
          localStorage.removeItem('personalizacion_notification');
        }, 3000);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También verificar al montar el componente
    const existingNotification = localStorage.getItem('personalizacion_notification');
    if (existingNotification) {
      const data = JSON.parse(existingNotification);
      setNotificacion(data);
      setTimeout(() => {
        setNotificacion(null);
        localStorage.removeItem('personalizacion_notification');
      }, 3000);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const cargarOpcionesDinamicas = async () => {
    try {
      setLoading(true);

      const [riesgosResponse, config] = await Promise.all([
        apiService.getRiesgoPersonalizaciones(),
        apiService.getConfiguracionSistema()
      ]);

      const riesgosMap: Record<string, 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO'> = {};
      riesgosResponse.forEach(item => {
        riesgosMap[item.item_personalizacion_id] = item.estado;
      });
      
      // Obtener todas las categorías activas
      const todasCategorias = await apiService.getCategoriasPersonalizacion();
      
      // Filtrar por las categorías habilitadas en el producto y ordenar por el campo orden
      const categoriasHabilitadas = producto?.personalizaciones_habilitadas || [];
      const categoriasParaCargar = todasCategorias
        .filter(cat => categoriasHabilitadas.includes(cat.nombre))
        .sort((a, b) => a.orden - b.orden);
      
      // Cargar items de cada categoría desde items_personalizacion
      const categoriasCompletas = await Promise.all(
        categoriasParaCargar.map(async (cat) => {
          const items = await apiService.getItemsPersonalizacion(cat.id);
          // Filtrar items disponibles considerando inventario y reglas de bloqueo
          const itemsDisponibles = items.filter((item: any) => {
            const disponible = item.disponible === 1 || item.disponible === true;
            const usaInventario = Boolean(item.usa_inventario);
            const usaInsumos = Boolean(item.usa_insumos);
            const riesgoInsumos = usaInsumos ? riesgosMap[item.id] : null;
            
            if (!disponible) return false;

            // Bloqueo por Insumos
            // AGOTADO siempre bloquea. Los demás dependen de la configuración.
            if (riesgoInsumos === 'AGOTADO') return false;
            
            if (config.critico_modo === 'CRITICO' && riesgoInsumos === 'CRITICO') return false;
            if (config.critico_modo === 'BAJO' && (riesgoInsumos === 'CRITICO' || riesgoInsumos === 'BAJO')) return false;
            
            // Si usa inventario físico, verificar que tenga stock
            if (usaInventario) {
              return item.cantidad_actual !== null && item.cantidad_actual > 0;
            }
            
            return true;
          });
          
          return {
            id: cat.id,
            nombre: cat.nombre,
            items: itemsDisponibles
          };
        })
      );
      
      setCategoriasConItems(categoriasCompletas);
    } catch (error) {
      console.error('Error al cargar opciones de personalización:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccion = (categoriaId: string, itemId: string) => {
    const nuevaPersonalizacion = { ...personalizacion };
    
    // Si ya está seleccionado, deseleccionar (toggle)
    if (nuevaPersonalizacion[categoriaId] === itemId) {
      delete nuevaPersonalizacion[categoriaId];
    } else {
      nuevaPersonalizacion[categoriaId] = itemId;
    }
    
    // Calcular precio adicional total
    let precioAdicionalTotal = 0;
    for (const [catId, itmId] of Object.entries(nuevaPersonalizacion)) {
      if (catId === 'precio_adicional') continue;
      const categoria = categoriasConItems.find(c => c.id === catId);
      if (categoria) {
        const item = categoria.items.find(i => i.id === itmId);
        if (item && item.precio_adicional > 0) {
          precioAdicionalTotal += item.precio_adicional;
        }
      }
    }
    
    nuevaPersonalizacion.precio_adicional = precioAdicionalTotal;
    
    setPersonalizacion(nuevaPersonalizacion);
    onPersonalizacionChange(nuevaPersonalizacion);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-secondary-600 mt-2">Cargando opciones de personalización...</p>
        </div>
      </div>
    );
  }

  if (categoriasConItems.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No hay opciones de personalización disponibles para este producto.
      </div>
    );
  }

  return (
    <>
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

      <div className="space-y-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          🍽️ Personalizar {producto?.nombre || 'Producto'}
        </h3>

        {categoriasConItems.map((categoria) => (
          <div key={categoria.id}>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Seleccionar {categoria.nombre}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {categoria.items.map((item) => {
                const estaSeleccionado = personalizacion[categoria.id] === item.id;
                const usaInventario = Boolean((item as any).usa_inventario);
                const cantidadActual = (item as any).cantidad_actual;
                const inventarioBajo = usaInventario && cantidadActual !== null && cantidadActual <= 5 && cantidadActual > 0;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSeleccion(categoria.id, item.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                      estaSeleccionado
                        ? 'border-blue-500 bg-blue-100 text-blue-800'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{item.nombre}</div>
                      {inventarioBajo && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded" title={`Solo quedan ${cantidadActual} unidades`}>
                          ⚠️ {cantidadActual} disponibles
                        </span>
                      )}
                    </div>
                    {item.precio_adicional > 0 && (
                      <div className="text-sm text-blue-600">
                        +${item.precio_adicional.toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
