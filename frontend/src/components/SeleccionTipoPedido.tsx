'use client';

import { Store, Truck } from 'lucide-react';

interface SeleccionTipoPedidoProps {
  tipoPedidoSeleccionado?: 'mesa' | 'domicilio' | 'llevar';
  onTipoPedidoSelect: (tipo: 'mesa' | 'domicilio') => void;
}

export default function SeleccionTipoPedido({ 
  tipoPedidoSeleccionado, 
  onTipoPedidoSelect 
}: SeleccionTipoPedidoProps) {
  
  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-secondary-800 mb-4">
        Tipo de Pedido
      </h2>
      <p className="text-secondary-600 mb-6">
        Seleccione si el pedido es para consumo en el restaurante o para domicilio/llevar
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opción Mesa */}
        <button
          onClick={() => onTipoPedidoSelect('mesa')}
          className={`
            relative p-6 rounded-lg border-2 transition-all duration-200 
            flex flex-col items-center justify-center min-h-[200px]
            ${tipoPedidoSeleccionado === 'mesa'
              ? 'border-primary-500 bg-primary-50 shadow-md'
              : 'border-secondary-300 bg-white hover:border-primary-300 hover:bg-primary-25'
            }
          `}
        >
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center mb-4
            ${tipoPedidoSeleccionado === 'mesa'
              ? 'bg-primary-500 text-white'
              : 'bg-secondary-100 text-secondary-600'
            }
          `}>
            <Store size={40} />
          </div>
          <h3 className={`
            text-xl font-bold mb-2
            ${tipoPedidoSeleccionado === 'mesa'
              ? 'text-primary-700'
              : 'text-secondary-700'
            }
          `}>
            Mesa
          </h3>
          <p className="text-sm text-secondary-600 text-center">
            Para consumo en el restaurante
          </p>
          
          {tipoPedidoSeleccionado === 'mesa' && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
          )}
        </button>

        {/* Opción Domicilio */}
        <button
          onClick={() => onTipoPedidoSelect('domicilio')}
          className={`
            relative p-6 rounded-lg border-2 transition-all duration-200 
            flex flex-col items-center justify-center min-h-[200px]
            ${tipoPedidoSeleccionado === 'domicilio'
              ? 'border-green-500 bg-green-50 shadow-md'
              : 'border-secondary-300 bg-white hover:border-green-300 hover:bg-green-25'
            }
          `}
        >
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center mb-4
            ${tipoPedidoSeleccionado === 'domicilio'
              ? 'bg-green-500 text-white'
              : 'bg-secondary-100 text-secondary-600'
            }
          `}>
            <Truck size={40} />
          </div>
          <h3 className={`
            text-xl font-bold mb-2
            ${tipoPedidoSeleccionado === 'domicilio'
              ? 'text-green-700'
              : 'text-secondary-700'
            }
          `}>
            Domicilio / Para Llevar
          </h3>
          <p className="text-sm text-secondary-600 text-center">
            Para entrega a domicilio o recogida en el restaurante
          </p>
          
          {tipoPedidoSeleccionado === 'domicilio' && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
          )}
        </button>
      </div>

      {tipoPedidoSeleccionado && (
        <div className={`
          mt-6 p-4 rounded-lg border-l-4
          ${tipoPedidoSeleccionado === 'mesa' 
            ? 'bg-primary-50 border-primary-500' 
            : 'bg-green-50 border-green-500'
          }
        `}>
          <p className={`
            font-medium
            ${tipoPedidoSeleccionado === 'mesa' 
              ? 'text-primary-800' 
              : 'text-green-800'
            }
          `}>
            {tipoPedidoSeleccionado === 'mesa' 
              ? '✓ Pedido para mesa - Seleccione mesa y mesero en el siguiente paso'
              : '✓ Pedido a domicilio - Ingrese los datos del cliente en el siguiente paso'
            }
          </p>
        </div>
      )}
    </div>
  );
}
