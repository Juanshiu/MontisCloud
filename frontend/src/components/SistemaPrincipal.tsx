'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/components/Login';
import UserInfo from '@/components/UserInfo';
import FormularioComandas from '@/components/FormularioComandas';
import InterfazCaja from '@/components/InterfazCaja';
import Reportes from '@/components/Reportes';
import Administracion from '@/components/Administracion';
import HistorialComandas from '@/components/HistorialComandas';
import { ShoppingCart, Calculator, BarChart3, Settings, Menu, X, History } from 'lucide-react';

type Vista = 'comandas' | 'caja' | 'reportes' | 'admin' | 'historial';

interface VistaConfig {
  id: Vista;
  nombre: string;
  icon: any;
  descripcion: string;
  permisos?: string[];
}

export default function SistemaPrincipal() {
  const { isAuthenticated, isLoading, usuario, tienePermiso } = useAuth();
  const [vistaActual, setVistaActual] = useState<Vista>('comandas');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Definición de vistas (movida antes de los returns condicionales)
  const vistas: VistaConfig[] = [
    {
      id: 'comandas' as Vista,
      nombre: 'Tomar Comandas',
      icon: ShoppingCart,
      descripcion: 'Crear nuevas comandas',
      permisos: ['crear_comandas']
    },
    {
      id: 'caja' as Vista,
      nombre: 'Caja',
      icon: Calculator,
      descripcion: 'Procesar pagos y liberar mesas',
      permisos: ['gestionar_caja']
    },
    {
      id: 'historial' as Vista,
      nombre: 'Historial',
      icon: History,
      descripcion: 'Ver historial de comandas',
      permisos: ['ver_reportes', 'gestionar_caja', 'ver_historial'] // Agregado ver_historial
    },
    {
      id: 'reportes' as Vista,
      nombre: 'Reportes',
      icon: BarChart3,
      descripcion: 'Ver estadísticas de ventas',
      permisos: ['ver_reportes']
    },
    {
      id: 'admin' as Vista,
      nombre: 'Administración',
      icon: Settings,
      descripcion: 'Gestionar sistema y productos',
      permisos: ['gestionar_sistema', 'gestion_menu', 'gestion_espacios'] // Corregido a gestion_
    }
  ];

  // Filtrar vistas según permisos
  const vistasPermitidas = vistas.filter(vista => {
    if (!vista.permisos) return true;
    return vista.permisos.some(p => tienePermiso(p));
  });

  // Redirigir si la vista actual no está permitida
  useEffect(() => {
    if (!isLoading && isAuthenticated && vistasPermitidas.length > 0) {
      const vistaActualPermitida = vistasPermitidas.some(v => v.id === vistaActual);
      if (!vistaActualPermitida) {
        setVistaActual(vistasPermitidas[0].id);
      }
    }
  }, [vistasPermitidas, vistaActual, isLoading, isAuthenticated]);

  const renderVista = () => {
    switch (vistaActual) {
      case 'comandas':
        return <FormularioComandas />;
      case 'caja':
        return <InterfazCaja />;
      case 'historial':
        return <HistorialComandas />;
      case 'reportes':
        return <Reportes />;
      case 'admin':
        return <Administracion />;
      default:
        return <FormularioComandas />;
    }
  };

  // Si está cargando, mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-secondary-800 hidden md:block">
                Montis Cloud - Sistema de Comandas
              </h1>
              <h1 className="text-lg font-bold text-secondary-800 md:hidden">
                Montis Cloud
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Información del Usuario */}
              <div className="hidden lg:block">
                <UserInfo />
              </div>

              {/* Navegación desktop (ahora alineada a la derecha) */}
              <nav className="hidden lg:flex space-x-2">
              {vistasPermitidas.map((vista) => {
                const Icon = vista.icon;
                return (
                  <button
                    key={vista.id}
                    onClick={() => setVistaActual(vista.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      vistaActual === vista.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{vista.nombre}</span>
                  </button>
                );
              })}
            </nav>

            {/* Botón menú móvil */}
            <div className="lg:hidden">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="text-secondary-600 hover:text-secondary-900 p-2"
              >
                {menuAbierto ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Menú móvil */}
        {menuAbierto && (
          <div className="lg:hidden border-t bg-white">
            <div className="p-4 border-b border-secondary-100">
              <UserInfo />
            </div>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {vistasPermitidas.map((vista) => {
                const Icon = vista.icon;
                return (
                  <button
                    key={vista.id}
                    onClick={() => {
                      setVistaActual(vista.id);
                      setMenuAbierto(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      vistaActual === vista.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                    }`}
                  >
                    <Icon size={20} />
                    <div className="text-left">
                      <div>{vista.nombre}</div>
                      <div className="text-xs text-secondary-500">{vista.descripcion}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Indicador de vista actual */}
      <div className="bg-primary-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2">
            {(() => {
              const vistaActiva = vistasPermitidas.find(v => v.id === vistaActual);
              if (vistaActiva) {
                const Icon = vistaActiva.icon;
                return (
                  <>
                    <Icon size={16} />
                    <span className="text-sm font-medium">{vistaActiva.nombre}</span>
                    <span className="text-primary-200">•</span>
                    <span className="text-sm text-primary-200">{vistaActiva.descripcion}</span>
                  </>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {renderVista()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-secondary-500">
            Montis Cloud - Sistema de Comandas v2.0 © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
