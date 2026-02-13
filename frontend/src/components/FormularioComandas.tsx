'use client';

import { useState } from 'react';
import { Mesa, FormularioComanda, ItemComanda, PasoComanda, Comanda, DatosCliente } from '@/types';
import SeleccionMesaYMesero from './SeleccionMesa';
import SeleccionTipoPedido from './SeleccionTipoPedido';
import FormularioDatosCliente from './FormularioDatosCliente';
import SeleccionTipoServicio from './SeleccionTipoServicio';
import SeleccionProductos from './SeleccionProductos';
import ResumenComanda from './ResumenComanda';
import BuscadorProductos from './BuscadorProductos';
import { ChevronLeft, ChevronRight, Check, Edit, X } from 'lucide-react';

export default function FormularioComandas() {
  const [pasoActual, setPasoActual] = useState(0);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [comandaEditando, setComandaEditando] = useState<Comanda | null>(null);
  const [formulario, setFormulario] = useState<FormularioComanda>({
    mesas: [],
    items: [],
    // mesero: '', // ELIMINADO
    tipo_pedido: 'mesa' // Por defecto es mesa
  });

  const pasos: PasoComanda[] = [
    { 
      paso: 0, 
      titulo: 'Tipo de Pedido', 
      completado: !!formulario.tipo_pedido 
    },
    { 
      paso: 1, 
      titulo: formulario.tipo_pedido === 'domicilio' ? 'Datos del Cliente' : 'Seleccionar Mesa', 
      completado: formulario.tipo_pedido === 'domicilio' 
        ? (!!formulario.datos_cliente?.nombre)
        : (formulario.mesas.length > 0)
    },
    { 
      paso: 2, 
      titulo: 'Tipo de Servicio', 
      completado: !!formulario.tipo_servicio 
    },
    { 
      paso: 3, 
      titulo: 'Seleccionar Productos', 
      completado: formulario.items.length > 0 
    },
    { 
      paso: 4, 
      titulo: 'Resumen y Envío', 
      completado: false 
    }
  ];

  const handleEditarComanda = async (comanda: Comanda) => {
    setModoEdicion(true);
    setComandaEditando(comanda);
    
    // Cargar los productos completos desde la API para tener personalizaciones_habilitadas
    try {
      const { apiService } = await import('@/services/api');
      const productosCompletos = await apiService.getAllProductos();
      
      // Enriquecer los items con los productos completos
      const itemsEnriquecidos = comanda.items.map(item => {
        const productoCompleto = productosCompletos.find(p => p.id === item.producto.id);
        return {
          ...item,
          producto: productoCompleto || item.producto
        };
      });
      
      setFormulario({
        mesas: comanda.mesas,
        items: itemsEnriquecidos,
        // mesero: comanda.mesero, // ELIMINADO
        observaciones_generales: comanda.observaciones_generales,
        tipo_pedido: comanda.tipo_pedido || 'mesa',
        datos_cliente: comanda.datos_cliente
      });
    } catch (error) {
      console.error('Error al cargar productos:', error);
      // Si falla, usar los items originales
      setFormulario({
        mesas: comanda.mesas,
        items: comanda.items,
        // mesero: comanda.mesero, // ELIMINADO
        observaciones_generales: comanda.observaciones_generales,
        tipo_pedido: comanda.tipo_pedido || 'mesa',
        datos_cliente: comanda.datos_cliente
      });
    }
    
    setPasoActual(2); // Ir a la selección de tipo de servicio
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setComandaEditando(null);
    setFormulario({
      mesas: [],
      items: [],
      // mesero: '', // ELIMINADO
      tipo_pedido: 'mesa'
    });
    setPasoActual(0);
  };

  const handleMesasSelect = (mesas: Mesa[]) => {
    setFormulario(prev => ({ ...prev, mesas }));
  };

  /* ELIMINADO: handleMeseroChange
  const handleMeseroChange = (mesero: string) => {
    setFormulario(prev => ({ ...prev, mesero }));
  };
  */

  const handleProductosChange = (items: ItemComanda[]) => {
    setFormulario(prev => ({ ...prev, items }));
  };

  const handleTipoServicioSelect = (tipo: string) => {
    setFormulario(prev => ({ ...prev, tipo_servicio: tipo }));
  };

  const handleObservacionesChange = (observaciones: string) => {
    setFormulario(prev => ({ ...prev, observaciones_generales: observaciones }));
  };

  const handleTipoPedidoSelect = (tipo: 'mesa' | 'domicilio') => {
    setFormulario(prev => ({ 
      ...prev, 
      tipo_pedido: tipo,
      // Limpiar datos según el tipo
      mesas: tipo === 'domicilio' ? [] : prev.mesas,
      datos_cliente: tipo === 'mesa' ? undefined : prev.datos_cliente
    }));
  };

  const handleDatosClienteChange = (datos: DatosCliente) => {
    setFormulario(prev => ({ ...prev, datos_cliente: datos }));
  };

  const puedeAvanzar = () => {
    switch (pasoActual) {
      case 0: 
        return !!formulario.tipo_pedido;
      case 1:
        if (formulario.tipo_pedido === 'domicilio') {
          // Para domicilio: validar nombre y dirección (solo si no es para llevar)
          const datosValidos = formulario.datos_cliente?.nombre.trim() !== '' && 
                                (formulario.datos_cliente?.es_para_llevar || 
                                 formulario.datos_cliente?.direccion.trim() !== '');
          return datosValidos;
        } else {
          // Para mesa: validar mesas
          return formulario.mesas.length > 0;
        }
      case 2: 
        return !!formulario.tipo_servicio;
      case 3: 
        return formulario.items.length > 0;
      case 4: 
        return false; // Último paso
      default: 
        return false;
    }
  };

  const siguientePaso = () => {
    if (puedeAvanzar() && pasoActual < pasos.length - 1) {
      setPasoActual(prev => prev + 1);
    }
  };

  const pasoAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(prev => prev - 1);
    }
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 0:
        return (
          <SeleccionTipoPedido
            tipoPedidoSeleccionado={formulario.tipo_pedido}
            onTipoPedidoSelect={handleTipoPedidoSelect}
          />
        );
      case 1:
        if (formulario.tipo_pedido === 'domicilio') {
          return (
            <FormularioDatosCliente
              datosCliente={formulario.datos_cliente}
              onDatosClienteChange={handleDatosClienteChange}
            />
          );
        } else {
          return (
            <SeleccionMesaYMesero 
              mesasSeleccionadas={formulario.mesas}
              onMesasChange={handleMesasSelect}
              onEditarComanda={handleEditarComanda}
            />
          );
        }
      case 2:
        return (
          <SeleccionTipoServicio
            onTipoSelect={handleTipoServicioSelect}
            tipoSeleccionado={formulario.tipo_servicio}
          />
        );
      case 3:
        return (
          <>
            <BuscadorProductos
              onAgregarProducto={(item) => {
                setFormulario(prev => ({
                  ...prev,
                  items: [...prev.items, item]
                }));
              }}
              productosEnCarrito={formulario.items.length}
            />
            {formulario.tipo_servicio && (
              <SeleccionProductos
                categoria={formulario.tipo_servicio}
                items={formulario.items}
                onItemsChange={handleProductosChange}
              />
            )}
          </>
        );
      case 4:
        return (
          <ResumenComanda
            formulario={formulario}
            onObservacionesChange={handleObservacionesChange}
            modoEdicion={modoEdicion}
            comandaId={comandaEditando?.id}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {/* <h1 className="text-3xl font-bold text-secondary-800 mb-2">
            Montis Cloud - Sistema de Comandas
          </h1> */}
          <p className="text-secondary-600">
            {modoEdicion ? 'Editando comanda existente' : 'Complete los pasos para crear una nueva comanda'}
          </p>
          {modoEdicion && comandaEditando && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Edit className="mr-2 text-blue-600" size={20} />
                  <div className="text-left">
                    <p className="font-semibold text-blue-800">
                      Editando comanda: {comandaEditando.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ')}
                    </p>
                    <p className="text-sm text-blue-600">
                      Estado: {comandaEditando.estado} | Mesero: {comandaEditando.mesero}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelarEdicion}
                  className="btn-secondary flex items-center"
                >
                  <X className="mr-1" size={16} />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de pasos */}
        <div className="card mb-6">
          {/* Vista desktop */}
          <div className="hidden lg:flex items-center justify-between">
            {pasos.map((paso, index) => (
              <div key={paso.paso} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                  ${index === pasoActual 
                    ? 'border-primary-500 bg-primary-500 text-white' 
                    : paso.completado
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-secondary-300 bg-white text-secondary-500'
                  }
                `}>
                  {paso.completado ? (
                    <Check size={20} />
                  ) : (
                    <span className="font-semibold">{paso.paso + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <div className={`font-medium ${
                    index === pasoActual 
                      ? 'text-primary-600' 
                      : paso.completado
                      ? 'text-green-600'
                      : 'text-secondary-500'
                  }`}>
                    {paso.titulo}
                  </div>
                </div>
                {index < pasos.length - 1 && (
                  <div className={`mx-4 w-16 h-0.5 ${
                    paso.completado ? 'bg-green-500' : 'bg-secondary-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Vista móvil */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-secondary-800">
                Paso {pasoActual + 1} de {pasos.length}
              </div>
              <div className="flex space-x-1">
                {pasos.map((paso, index) => (
                  <div
                    key={paso.paso}
                    className={`w-3 h-3 rounded-full ${
                      index === pasoActual
                        ? 'bg-primary-500'
                        : paso.completado
                        ? 'bg-green-500'
                        : 'bg-secondary-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="bg-secondary-50 rounded-lg p-3 border-l-4 border-primary-500">
              <div className="font-medium text-primary-600">
                {pasos[pasoActual].titulo}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div className="mb-6">
          {renderPasoActual()}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between">
          <button
            onClick={pasoAnterior}
            disabled={pasoActual === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeft size={20} className="mr-2" />
            Anterior
          </button>

          {pasoActual < pasos.length - 1 ? (
            <button
              onClick={siguientePaso}
              disabled={!puedeAvanzar()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Siguiente
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}
