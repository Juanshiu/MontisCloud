'use client';

import { useState, useEffect } from 'react';
import { FormularioComanda, PersonalizacionItem, Mesa, ItemComanda } from '@/types';
import { apiService } from '@/services/api';
import { Printer, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PersonalizacionDisplay from './shared/PersonalizacionDisplay';
import { getIconoCategoria } from '@/utils/personalizacionUtils';
import { usePersonalizaciones } from './shared/hooks/usePersonalizaciones';

interface ResumenComandaProps {
  formulario: FormularioComanda;
  onObservacionesChange: (observaciones: string) => void;
  modoEdicion?: boolean;
  comandaId?: string;
}

export default function ResumenComanda({ formulario, onObservacionesChange, modoEdicion = false, comandaId }: ResumenComandaProps) {
  const { usuario } = useAuth();
  const { ordenarPersonalizaciones, obtenerInfoPersonalizacion, loading: loadingPersonalizaciones } = usePersonalizaciones();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mostrarDialogoImpresion, setMostrarDialogoImpresion] = useState(false);

  const calcularSubtotal = (): number => {
    return formulario.items.reduce((total: number, item: ItemComanda) => total + item.subtotal, 0);
  };

  const calcularTotal = (): number => {
    // Aquí podrías agregar lógica para impuestos, descuentos, etc.
    return calcularSubtotal();
  };

  const enviarComanda = async () => {
    // Validaciones según el tipo de pedido
    if (formulario.tipo_pedido === 'domicilio') {
      if (!formulario.datos_cliente || !formulario.datos_cliente.nombre.trim()) {
        setError('Debe ingresar el nombre del cliente');
        return;
      }
      if (!formulario.datos_cliente.es_para_llevar && !formulario.datos_cliente.direccion.trim()) {
        setError('Debe ingresar la dirección de entrega');
        return;
      }
    } else {
      if (!formulario.mesas || formulario.mesas.length === 0) {
        setError('Debe seleccionar al menos una mesa');
        return;
      }
    }

    if (formulario.items.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    /* ELIMINADO: Validación manual de mesero
    if (!formulario.mesero || formulario.mesero.trim() === '') {
      setError('Debe ingresar el nombre del mesero');
      return;
    }
    */

    // Si estamos editando, mostrar diálogo de confirmación para impresión
    if (modoEdicion && comandaId) {
      setMostrarDialogoImpresion(true);
      return;
    }

    // Si no estamos editando, enviar normalmente
    await procesarEnvioComanda();
  };

  const procesarEnvioComanda = async (imprimirAdicionales?: boolean, imprimirCompleta?: boolean) => {
    try {
      setEnviando(true);
      setError(null);

      const comandaData = {
        mesas: formulario.tipo_pedido === 'mesa' ? formulario.mesas : [],
        items: formulario.items,
        subtotal: calcularSubtotal(),
        total: calcularTotal(),
        // mesero: formulario.mesero, // ELIMINADO: Se asigna en backend desde el token
        tipo_pedido: formulario.tipo_pedido || 'mesa',
        datos_cliente: formulario.tipo_pedido === 'domicilio' ? formulario.datos_cliente : undefined,
        observaciones_generales: formulario.observaciones_generales
      };

      console.log('📤 Enviando comanda:', JSON.stringify(comandaData, null, 2));

      if (modoEdicion && comandaId) {
        // Editar comanda existente - con opción de imprimir o no
        await apiService.editarComanda(
          comandaId, 
          comandaData.items, 
          comandaData.observaciones_generales, 
          imprimirAdicionales,
          imprimirCompleta
        );
        
        // Notificar a otras partes del sistema que se editó una comanda y se descontó inventario
        localStorage.setItem('comanda_completada', Date.now().toString());
        window.dispatchEvent(new Event('inventario_updated'));
        
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Crear nueva comanda
        console.log('🚀 Creando nueva comanda...');
        const response = await apiService.createComanda(comandaData);
        console.log('✅ Respuesta del servidor:', response);

        // Notificar a otras partes del sistema que se creó una comanda y se descontó inventario
        localStorage.setItem('comanda_completada', Date.now().toString());
        window.dispatchEvent(new Event('inventario_updated'));

        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error: any) {
      console.error('❌ Error al procesar comanda:', error);
      console.error('📋 Detalles del error:', error.response?.data);
      const detalle = error.response?.data?.detalle;
      if (detalle?.tipo === 'INSUMO' && detalle?.insumo_nombre && detalle?.disponible !== undefined) {
        const disponible = `${detalle.disponible} ${detalle.unidad || ''}`.trim();
        const exceso = detalle.exceso !== undefined ? `${detalle.exceso} ${detalle.unidad || ''}`.trim() : null;
        const sugerencia = detalle.sugerencia_cantidad
          ? `Debes quitar al menos ${detalle.sugerencia_cantidad} unidad(es) de productos que usen este insumo.`
          : 'Debes ajustar la cantidad de productos que usan este insumo.';
        setError(
          `Inventario insuficiente para insumo: ${detalle.insumo_nombre}. Disponible: ${disponible}` +
          (exceso ? `. Exceso: ${exceso}. ` : '. ') +
          sugerencia
        );
      } else if (detalle?.tipo === 'PRODUCTO' && detalle?.producto_nombre && detalle?.disponible !== undefined) {
        const exceso = detalle.exceso !== undefined ? detalle.exceso : null;
        const sugerencia = detalle.sugerencia_cantidad
          ? `Debes quitar al menos ${detalle.sugerencia_cantidad} unidad(es) de este producto.`
          : 'Debes ajustar la cantidad de este producto.';
        setError(
          `Inventario insuficiente para producto: ${detalle.producto_nombre}. Disponible: ${detalle.disponible}` +
          (exceso !== null ? `. Exceso: ${exceso}. ` : '. ') +
          sugerencia
        );
      } else if (detalle?.tipo === 'PERSONALIZACION' && detalle?.personalizacion_nombre && detalle?.disponible !== undefined) {
        const exceso = detalle.exceso !== undefined ? detalle.exceso : null;
        const sugerencia = detalle.sugerencia_cantidad
          ? `Debes quitar al menos ${detalle.sugerencia_cantidad} unidad(es) de esta personalización.`
          : 'Debes ajustar la cantidad de esta personalización.';
        setError(
          `Inventario insuficiente para personalización: ${detalle.personalizacion_nombre}. Disponible: ${detalle.disponible}` +
          (exceso !== null ? `. Exceso: ${exceso}. ` : '. ') +
          sugerencia
        );
      } else {
        const errorMessage = error.response?.data?.error || `Error al ${modoEdicion ? 'actualizar' : 'crear'} la comanda. Intente nuevamente.`;
        setError(errorMessage);
      }
    } finally {
      setEnviando(false);
      setMostrarDialogoImpresion(false);
    }
  };

  const mostrarVistaPrevia = () => {
    // En modo edición, filtrar solo los nuevos items
    const itemsParaPrevia = modoEdicion ? 
      formulario.items.filter((item: ItemComanda) => item.id.startsWith('temp_')) : 
      formulario.items;

    const ANCHO_LINEA = 48;
    const separador = '========================';
    const separadorCorto = '------------------------';

    const dividirTexto = (texto: string, maxLength: number): string[] => {
      if (texto.length <= maxLength) return [texto];
      const palabras = texto.split(' ');
      const lineas: string[] = [];
      let lineaActual = '';
      palabras.forEach(palabra => {
        if ((lineaActual + ' ' + palabra).trim().length <= maxLength) {
          lineaActual = lineaActual ? lineaActual + ' ' + palabra : palabra;
        } else {
          if (lineaActual) lineas.push(lineaActual);
          lineaActual = palabra;
        }
      });
      if (lineaActual) lineas.push(lineaActual);
      return lineas;
    };

    const lineas: string[] = [];
    const fecha = new Date();

    // Encabezado similar a printer.ts
    lineas.push(`Fecha: ${fecha.toLocaleDateString('es-CO')}`);
    lineas.push(`Hora:  ${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
    lineas.push(`Atendido por: ${usuario?.nombre_completo || 'Usuario del Sistema'}`);
    lineas.push('');

    // Información de mesa o cliente
    if (formulario.tipo_pedido === 'domicilio' && formulario.datos_cliente) {
      if (formulario.datos_cliente.es_para_llevar) {
        lineas.push(`PARA LLEVAR: ${formulario.datos_cliente.nombre}`);
      } else {
        lineas.push(`DOMICILIO: ${formulario.datos_cliente.nombre}`);
        if (formulario.datos_cliente.direccion) {
          lineas.push('Dirección:');
          const dirLineas = dividirTexto(formulario.datos_cliente.direccion, ANCHO_LINEA - 2);
          dirLineas.forEach(l => lineas.push(`  ${l}`));
        }
      }
      if (formulario.datos_cliente.telefono) {
        lineas.push(`Tel: ${formulario.datos_cliente.telefono}`);
      }
    } else if (formulario.mesas && formulario.mesas.length > 0) {
      const mesasTexto = formulario.mesas.map((m: Mesa) => `${m.numero}`).join(', ');
      if (mesasTexto.length <= 24) {
        lineas.push(`Mesa(s): ${mesasTexto}`);
      } else {
        lineas.push('Mesa(s):');
        const mesasLineas = dividirTexto(mesasTexto, ANCHO_LINEA - 2);
        mesasLineas.forEach(l => lineas.push(`  ${l}`));
      }
    }

    lineas.push('');
    lineas.push(separador);
    if (modoEdicion) {
      lineas.push('    ⚠️  ITEMS ADICIONALES');
      lineas.push(separador);
    }
    lineas.push('');

    // Items
    if (itemsParaPrevia.length > 0) {
      itemsParaPrevia.forEach((item: ItemComanda, index: number) => {
        if (index > 0) lineas.push(separadorCorto);

        const nombreProducto = item.producto.nombre;
        const cantidadTexto = `${item.cantidad}x`;
        const productoCompleto = `${cantidadTexto} ${nombreProducto}`;

        if (productoCompleto.length > ANCHO_LINEA) {
          lineas.push(cantidadTexto);
          lineas.push(`  ${nombreProducto}`);
        } else {
          lineas.push(productoCompleto);
        }

        // Personalización
        if (item.personalizacion && Object.keys(item.personalizacion).length > 0) {
          const entradasOrdenadas = ordenarPersonalizaciones(item.personalizacion);
          entradasOrdenadas.forEach(([catId, itemId]) => {
            const info = obtenerInfoPersonalizacion(catId, itemId);
            if (info) {
              lineas.push(`  ${info.item}`);
            }
          });
        }

        // Observaciones del item
        if (item.observaciones && item.observaciones.trim() !== '') {
          lineas.push('');
          lineas.push('  OBSERVACIONES:');
          const obsLineas = dividirTexto(item.observaciones, ANCHO_LINEA - 4);
          obsLineas.forEach(l => lineas.push(`    ${l}`));
        }
      });
    } else {
      lineas.push('No hay items');
    }

    lineas.push('');
    lineas.push(separador);

    // Observaciones generales
    if (formulario.observaciones_generales && formulario.observaciones_generales.trim() !== '') {
      lineas.push('');
      lineas.push('OBSERVACIONES GENERALES:');
      const obsLines = dividirTexto(formulario.observaciones_generales, ANCHO_LINEA);
      obsLines.forEach(l => lineas.push(l));
    }

    lineas.push('');
    lineas.push('     ENVIADO A COCINA');
    lineas.push(separador);
    lineas.push(separador);

    const comandaInfo = lineas.join('\n');

    // Mostrar en una ventana emergente
    const nuevaVentana = window.open('', '_blank', 'width=600,height=700');
    if (nuevaVentana) {
      nuevaVentana.document.write(`
        <html>
          <head>
            <title>Vista Previa - ${modoEdicion ? 'Items Adicionales' : 'Comanda'}</title>
            <style>
              body { font-family: monospace; padding: 20px; white-space: pre-line; }
              .print-btn { margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
              .warning { color: #dc2626; font-weight: bold; }
            </style>
          </head>
          <body>
            ${comandaInfo.replace(/\n/g, '<br>')}
            <button class="print-btn" onclick="window.print()">Imprimir</button>
          </body>
        </html>
      `);
      nuevaVentana.document.close();
    }
  };

  if (success) {
    return (
      <div className="card text-center">
        <div className="text-green-600 mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">¡Comanda Enviada!</h2>
          <p className="text-green-700">
            La comanda ha sido enviada exitosamente a cocina y se ha impreso automáticamente.
          </p>
          <p className="text-sm text-green-600 mt-2">
            Redirigiendo en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información de la comanda */}
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Información de la Comanda</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Mostrar Mesa o Datos de Cliente según el tipo */}
          {formulario.tipo_pedido === 'domicilio' ? (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                {formulario.datos_cliente?.es_para_llevar ? '🛍️ Para Llevar' : '🚚 Domicilio'}
              </label>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="font-semibold text-green-800">{formulario.datos_cliente?.nombre}</p>
                {formulario.datos_cliente?.telefono && (
                  <p className="text-sm text-green-700">📞 {formulario.datos_cliente.telefono}</p>
                )}
                {!formulario.datos_cliente?.es_para_llevar && formulario.datos_cliente?.direccion && (
                  <p className="text-sm text-green-700 mt-1">📍 {formulario.datos_cliente.direccion}</p>
                )}
                {formulario.datos_cliente?.es_para_llevar && (
                  <p className="text-xs text-green-600 mt-1">Cliente recoge en el restaurante</p>
                )}
              </div>
            </div>
          ) : (
            formulario.mesas && formulario.mesas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Mesa</label>
                <div className="p-3 bg-secondary-50 rounded-lg">
                  {formulario.mesas.map((m: Mesa) => `${m.salon} - ${m.numero}`).join(', ')} 
                  (Capacidad total: {formulario.mesas.reduce((sum: number, mesa: Mesa) => sum + mesa.capacidad, 0)})
                </div>
              </div>
            )
          )}
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Mesero</label>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Atendido por</label>
            <div className="p-3 bg-secondary-50 rounded-lg">
              {usuario?.nombre_completo || 'Usuario del Sistema'}
            </div>
          </div>

          {formulario.tipo_servicio && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Tipo de Servicio</label>
              <div className="p-3 bg-secondary-50 rounded-lg capitalize">
                {formulario.tipo_servicio.replace(/_/g, ' ')}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Observaciones Generales
          </label>
          <textarea
            value={formulario.observaciones_generales || ''}
            onChange={(e) => onObservacionesChange(e.target.value)}
            placeholder="Observaciones especiales para toda la comanda..."
            rows={3}
            className="input-field"
          />
        </div>
      </div>

      {/* Resumen de productos */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">
          Resumen de Productos ({formulario.items.length} items)
        </h3>
        
        {/* Leyenda de colores en modo edición */}
        {modoEdicion && formulario.items.some((item: ItemComanda) => item.id.startsWith('temp_') || item.id.startsWith('item_')) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Modo Edición - Agregando items adicionales:</p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
                <span className="text-secondary-600">Items originales</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
                <span className="text-secondary-600">Items adicionales (nuevos)</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {formulario.items.map((item: ItemComanda) => {
            const esItemAdicional = item.id.startsWith('temp_') || item.id.startsWith('item_');
            return (
            <div 
              key={item.id} 
              className={`p-4 rounded-lg border-l-4 ${
                modoEdicion && esItemAdicional
                  ? 'border-blue-500 bg-blue-50'
                  : modoEdicion && !esItemAdicional
                  ? 'border-green-500 bg-green-50'
                  : 'border-primary-500 bg-secondary-50'
              }`}
            >
              {/* Header con nombre del producto y precio */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 font-medium text-secondary-800 text-lg">
                  <span>{item.cantidad}x {item.producto.nombre}</span>
                  {modoEdicion && esItemAdicional && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-0.5 rounded">
                      NUEVO
                    </span>
                  )}
                </div>
                <div className="font-bold text-lg text-secondary-900 ml-4">
                  ${item.subtotal.toLocaleString()}
                </div>
              </div>
              
              <div className="text-sm text-secondary-600">
                ${item.precio_unitario.toLocaleString()} c/u
              </div>
              
              {/* Personalización - DINÁMICA basada en IDs */}
              {item.personalizacion && Object.keys(item.personalizacion).filter(k => k !== 'precio_adicional').length > 0 && (
                <PersonalizacionDisplay 
                  personalizacion={item.personalizacion} 
                  mostrarPrecios={true}
                  className="text-xs text-secondary-600 space-y-0.5 mt-2"
                />
              )}
              
              {/* Observaciones del item */}
              {item.observaciones && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    💬 Observaciones
                  </div>
                  <div className="text-sm text-blue-800">
                    {item.observaciones}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
        
        {/* Totales */}
        <div className="mt-6 pt-4 border-t border-secondary-200">
          <div className="space-y-2">
            <div className="flex justify-between text-secondary-700">
              <span>Subtotal:</span>
              <span>${calcularSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-secondary-800">
              <span>Total:</span>
              <span>${calcularTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 mr-2" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={enviarComanda}
            disabled={enviando || formulario.items.length === 0}
            className="btn-primary flex-1 flex items-center justify-center"
          >
            {enviando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {modoEdicion ? 'Actualizando...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Send size={20} className="mr-2" />
                {modoEdicion ? 'Actualizar Comanda' : 'Enviar Comanda'}
              </>
            )}
          </button>
          
          <button
            onClick={mostrarVistaPrevia}
            disabled={enviando}
            className="btn-secondary flex items-center justify-center"
          >
            <Printer size={20} className="mr-2" />
            Vista Previa
          </button>
        </div>
        
        <div className="mt-4 text-sm text-secondary-600 text-center">
          <p>{modoEdicion ? 'Al actualizar se pueden agregar productos adicionales' : 'Al enviar la comanda se imprimirá automáticamente en cocina'}</p>
        </div>
      </div>

      {/* Diálogo de confirmación de impresión para ediciones */}
      {mostrarDialogoImpresion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Printer className="text-primary-600 mr-3" size={32} />
              <h3 className="text-xl font-bold text-secondary-800">
                ¿Imprimir productos adicionales?
              </h3>
            </div>
            
            <p className="text-secondary-700 mb-4">
              Estás agregando productos a una comanda existente. ¿Deseas imprimir estos productos adicionales en cocina?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800">
                <strong>💡 Sugerencia:</strong> Normalmente no se imprimen bebidas o postres que se piden al final de la comida.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  // Verificar si hay items nuevos (con ID temporal) o items con incremento de cantidad
                  const hayItemsNuevos = formulario.items.some((item: ItemComanda) => 
                    typeof item.id === 'string' && (item.id.startsWith('temp_') || item.id.startsWith('item_'))
                  );
                  
                  // 🆕 NUEVO: Verificar si hay items con incremento de cantidad
                  // Esto solo aplica en modo edición, necesitaríamos acceso a items originales
                  // Por ahora, si hay items con IDs UUID válidos (no temp), asumimos que podrían tener incrementos
                  const hayItemsExistentes = formulario.items.some((item: ItemComanda) => 
                    typeof item.id === 'string' && !item.id.startsWith('temp_') && !item.id.startsWith('item_') && item.id.includes('-')
                  );
                  
                  if (!hayItemsNuevos && !hayItemsExistentes) {
                    alert('⚠️ No hay productos para procesar.');
                    return;
                  }
                  
                  // Si solo hay items existentes sin items nuevos, podría ser solo incremento de cantidad
                  // El backend se encargará de detectar si hay incrementos y manejarlos correctamente
                  if (!hayItemsNuevos && hayItemsExistentes) {
                    // Continuar normalmente, el backend detectará los incrementos
                    console.log('ℹ️ Procesando items con posibles incrementos de cantidad');
                  }

                  setMostrarDialogoImpresion(false);
                  procesarEnvioComanda(true, false);
                }}
                disabled={enviando}
                className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              >
                {enviando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Printer size={18} className="mr-2" />
                    Imprimir solo adicionales
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setMostrarDialogoImpresion(false);
                  procesarEnvioComanda(false, true);
                }}
                disabled={enviando}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              >
                <Printer size={18} className="mr-2" />
                Imprimir comanda completa
              </button>
              
              <button
                onClick={() => {
                  setMostrarDialogoImpresion(false);
                  procesarEnvioComanda(false, false);
                }}
                disabled={enviando}
                className="w-full px-4 py-3 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-semibold rounded-lg transition-colors"
              >
                No imprimir
              </button>
            </div>

            {!enviando && (
              <button
                onClick={() => setMostrarDialogoImpresion(false)}
                className="w-full mt-3 px-4 py-2 text-secondary-600 hover:text-secondary-800 text-sm transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
