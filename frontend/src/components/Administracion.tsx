'use client';

import { useState } from 'react';
import { Settings, Package, Tags, Utensils, Users, Home, Shield, UtensilsCrossed, Store, Cog, ChevronRight, ArrowLeft, FileText, Calculator } from 'lucide-react';
import GestionProductos from './admin/GestionProductos';
import GestionCategorias from './admin/GestionCategorias';
import GestionPersonalizaciones from './admin/GestionPersonalizaciones';
import GestionInventarioAvanzado from './admin/GestionInventarioAvanzado';
import GestionMesas from './admin/GestionMesas';
import GestionSalones from './admin/GestionSalones';
import ConfiguracionSistema from './admin/ConfiguracionSistema';
import GestionFacturacion from './admin/GestionFacturacion';
import GestionUsuarios from './admin/GestionUsuarios';
import GestionRoles from './admin/GestionRoles';
import GestionEmpleados from './admin/GestionEmpleados';
import GestionNomina from './admin/GestionNomina';
import GestionLiquidacion from './admin/GestionLiquidacion';
import GeneradorContratos from './admin/GeneradorContratos';
import GestionEmpresa from './admin/GestionEmpresa';

type SeccionAdmin = 'productos' | 'categorias' | 'personalizaciones' | 'inventario_avanzado' | 'mesas' | 'salones' | 'sistema' | 'facturacion' | 'usuarios' | 'roles' | 'empleados' | 'nomina' | 'liquidacion' | 'contratos' | 'empresa';

interface Seccion {
  id: SeccionAdmin;
  nombre: string;
  icon: React.ComponentType<any>;
  descripcion: string;
  component: React.ComponentType;
  permisos?: string[];
}

import { useAuth } from '@/contexts/AuthContext';

interface GrupoAdmin {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ComponentType<any>;
  colorClasses: {
    border: string;
    bg: string;
    bgHover: string;
    text: string;
    iconBg: string;
  };
  secciones: Seccion[];
}

export default function Administracion() {
  const { tienePermiso } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState<SeccionAdmin | null>(null);
  const [mostrandoInicio, setMostrandoInicio] = useState(true);

  // Estructura de grupos dinámicamente organizada
  const grupos: GrupoAdmin[] = [
    {
      id: 'menu',
      nombre: 'Gestión de Menú',
      descripcion: 'Administra productos, categorías y opciones de personalización',
      icon: UtensilsCrossed,
      colorClasses: {
        border: 'border-blue-500',
        bg: 'bg-blue-50',
        bgHover: 'hover:bg-blue-100',
        text: 'text-blue-700',
        iconBg: 'bg-blue-500',
      },
      secciones: [
        {
          id: 'productos',
          nombre: 'Productos',
          icon: Package,
          descripcion: 'Crear, editar y eliminar productos del menú',
          component: GestionProductos,
          permisos: ['gestion_menu']
        },
        {
          id: 'categorias',
          nombre: 'Categorías',
          icon: Tags,
          descripcion: 'Administrar categorías de productos',
          component: GestionCategorias,
          permisos: ['gestion_menu']
        },
        {
          id: 'personalizaciones',
          nombre: 'Personalizaciones',
          icon: Utensils,
          descripcion: 'Opciones de caldos, principios y proteínas',
          component: GestionPersonalizaciones,
          permisos: ['gestion_menu']
        },
        {
          id: 'inventario_avanzado',
          nombre: 'Inventario Avanzado',
          icon: Settings,
          descripcion: 'Insumos, recetas y ajustes por personalización',
          component: GestionInventarioAvanzado,
          permisos: ['gestion_menu']
        },
      ],
    },
    {
      id: 'espacios',
      nombre: 'Gestión de Espacios',
      descripcion: 'Configura mesas, salones y distribución del restaurante',
      icon: Store,
      colorClasses: {
        border: 'border-green-500',
        bg: 'bg-green-50',
        bgHover: 'hover:bg-green-100',
        text: 'text-green-700',
        iconBg: 'bg-green-500',
      },
      secciones: [
        {
          id: 'mesas',
          nombre: 'Mesas',
          icon: Users,
          descripcion: 'Crear, editar y eliminar mesas',
          component: GestionMesas,
          permisos: ['gestion_espacios']
        },
        {
          id: 'salones',
          nombre: 'Salones',
          icon: Home,
          descripcion: 'Administrar salones del restaurante',
          component: GestionSalones,
          permisos: ['gestion_espacios']
        },
      ],
    },
    {
        id: 'personal',
        nombre: 'Recursos Humanos',
        descripcion: 'Gestión de empleados y nómina',
        icon: Users,
        colorClasses: {
          border: 'border-purple-500',
          bg: 'bg-purple-50',
          bgHover: 'hover:bg-purple-100',
          text: 'text-purple-700',
          iconBg: 'bg-purple-500',
        },
        secciones: [
          {
            id: 'empleados',
            nombre: 'Empleados',
            icon: Users,
            descripcion: 'Directorio de personal y contratos',
            component: GestionEmpleados,
            permisos: ['nomina.gestion']
          },
          {
            id: 'nomina',
            nombre: 'Nómina',
            icon: FileText,
            descripcion: 'Configuración y pagos de nómina',
            component: GestionNomina,
            permisos: ['nomina.gestion']
          },
          {
            id: 'liquidacion',
            nombre: 'Liquidaciones',
            icon: Calculator,
            descripcion: 'Cálculo de liquidación por retiro',
            component: GestionLiquidacion,
            permisos: ['nomina.gestion']
          },
          {
            id: 'contratos',
            nombre: 'Generar Contrato',
            icon: FileText,
            descripcion: 'Generador de contratos laborales PDF',
            component: GeneradorContratos,
            permisos: ['nomina.gestion']
          }
        ]
    },
    {
      id: 'sistema',
      nombre: 'Configuración',
      descripcion: 'Herramientas avanzadas y configuración del sistema',
      icon: Cog,
      colorClasses: {
        border: 'border-red-500',
        bg: 'bg-red-50',
        bgHover: 'hover:bg-red-100',
        text: 'text-red-700',
        iconBg: 'bg-red-500',
      },
      secciones: [
        {
          id: 'empresa',
          nombre: 'Empresa',
          icon: Store,
          descripcion: 'Información comercial y legal de la empresa',
          component: GestionEmpresa,
          permisos: ['gestionar_sistema']
        },
        {
          id: 'facturacion',
          nombre: 'Configuración de Impresión',
          icon: FileText,
          descripcion: 'Configuración de facturas y recibos',
          component: GestionFacturacion,
          permisos: ['gestionar_sistema']
        },
        {
          id: 'usuarios',
          nombre: 'Usuarios',
          icon: Users,
          descripcion: 'Gestión de usuarios y accesos',
          component: GestionUsuarios,
          permisos: ['gestionar_sistema']
        },
        {
          id: 'roles',
          nombre: 'Roles y Permisos',
          icon: Shield,
          descripcion: 'Configuración de roles y permisos del sistema',
          component: GestionRoles,
          permisos: ['gestionar_sistema']
        },
        {
          id: 'sistema',
          nombre: 'Sistema',
          icon: Cog,
          descripcion: 'Configuración avanzada del sistema',
          component: ConfiguracionSistema,
          permisos: ['gestionar_sistema']
        },
      ],
    },
  ];

  // Filtrar grupos y secciones según permisos
  const gruposFiltrados = grupos.map(grupo => ({
    ...grupo,
    secciones: grupo.secciones.filter(seccion => {
      if (!seccion.permisos) return true;
      return seccion.permisos.some(p => tienePermiso(p));
    })
  })).filter(grupo => grupo.secciones.length > 0);

  const seccionActualData = gruposFiltrados
    .flatMap(g => g.secciones)
    .find(s => s.id === seccionActiva);

  const handleSeleccionarSeccion = (seccionId: SeccionAdmin) => {
    setSeccionActiva(seccionId);
    setMostrandoInicio(false);
  };

  const handleVolverInicio = () => {
    setSeccionActiva(null);
    setMostrandoInicio(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-secondary-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {!mostrandoInicio && (
                <button
                  onClick={handleVolverInicio}
                  className="flex items-center text-secondary-600 hover:text-secondary-900 transition-colors p-2"
                  title="Volver al inicio"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <Settings className="h-5 w-5 md:h-6 md:w-6 text-primary-600" />
              <div>
                <h1 className="text-sm md:text-xl font-bold text-secondary-800">
                  {mostrandoInicio 
                    ? 'Administración - Montis Cloud'
                    : seccionActualData?.nombre || 'Administración'}
                </h1>
                {!mostrandoInicio && seccionActualData && (
                  <p className="text-xs text-secondary-500 hidden sm:block">
                    {seccionActualData.descripcion}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mostrandoInicio ? (
          /* Vista de inicio con grupos */
          <div className="space-y-8">
            {/* Título de bienvenida */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary-900 mb-2">
                Panel de Administración
              </h2>
              <p className="text-secondary-600">
                Selecciona un área para comenzar a administrar
              </p>
            </div>

            {/* Grid de grupos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {gruposFiltrados.map((grupo) => {
                const GrupoIcon = grupo.icon;
                return (
                  <div
                    key={grupo.id}
                    className={`
                      bg-white rounded-xl shadow-sm border-2 ${grupo.colorClasses.border}
                      overflow-hidden transition-all duration-200 hover:shadow-md
                    `}
                  >
                    {/* Header del grupo */}
                    <div className={`${grupo.colorClasses.bg} p-6 border-b-2 ${grupo.colorClasses.border}`}>
                      <div className="flex items-start space-x-4">
                        <div className={`${grupo.colorClasses.iconBg} p-3 rounded-lg`}>
                          <GrupoIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold ${grupo.colorClasses.text} mb-1`}>
                            {grupo.nombre}
                          </h3>
                          <p className="text-sm text-secondary-600">
                            {grupo.descripcion}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Secciones del grupo */}
                    <div className="p-4 space-y-2">
                      {grupo.secciones.map((seccion) => {
                        const SeccionIcon = seccion.icon;
                        return (
                          <button
                            key={seccion.id}
                            onClick={() => handleSeleccionarSeccion(seccion.id)}
                            className={`
                              w-full flex items-center justify-between p-4 rounded-lg
                              border-2 border-transparent ${grupo.colorClasses.bgHover}
                              hover:border-secondary-300 transition-all duration-200
                              group
                            `}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="p-2 bg-secondary-100 rounded-lg group-hover:bg-white transition-colors">
                                <SeccionIcon className={`h-5 w-5 ${grupo.colorClasses.text}`} />
                              </div>
                              <div className="text-left flex-1">
                                <h4 className="font-semibold text-secondary-900 group-hover:text-secondary-700">
                                  {seccion.nombre}
                                </h4>
                                <p className="text-xs text-secondary-500 line-clamp-1">
                                  {seccion.descripcion}
                                </p>
                              </div>
                            </div>
                            <ChevronRight 
                              className={`h-5 w-5 text-secondary-400 group-hover:${grupo.colorClasses.text} transition-colors`} 
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer con contador */}
                    <div className={`${grupo.colorClasses.bg} px-6 py-3 border-t border-secondary-200`}>
                      <p className="text-xs text-secondary-600">
                        {grupo.secciones.length} {grupo.secciones.length === 1 ? 'sección' : 'secciones'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Información adicional */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Consejo</h4>
                  <p className="text-sm text-blue-800">
                    Todas las secciones están conectadas dinámicamente. Los cambios en categorías, salones 
                    y productos se reflejan automáticamente en todo el sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Vista de sección específica */
          <div>
            {seccionActualData && <seccionActualData.component />}
          </div>
        )}
      </div>
    </div>
  );
}
