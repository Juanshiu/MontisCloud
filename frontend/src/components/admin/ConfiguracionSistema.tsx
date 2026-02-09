'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, Database, RefreshCw, Trash2, Coffee, FileX,
  Lock, Unlock, Clock, Shield, Eye, EyeOff, ChevronDown, ChevronUp,
  Power, Calendar, History, CheckCircle, XCircle, Ban
} from 'lucide-react';
import apiService from '../../services/api';
import axios from 'axios';

// Crear instancia de axios con configuración similar a api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==============================
// INTERFACES
// ==============================
interface EstadoControlAcceso {
  servicio_cerrado: boolean;
  servicio_cerrado_desde: string | null;
  servicio_cerrado_por: string | null;
  servicio_cerrado_por_nombre?: string;
  horario_acceso_activo: boolean;
  horario_acceso_inicio: string | null;
  horario_acceso_fin: string | null;
  plan_actual: string;
  feature_disponible: boolean;
}

interface RegistroAuditoria {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  accion: string;
  detalles: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function ConfiguracionSistema() {
  // ==============================
  // ESTADO: Control de Acceso
  // ==============================
  const [estadoAcceso, setEstadoAcceso] = useState<EstadoControlAcceso | null>(null);
  const [cargandoAcceso, setCargandoAcceso] = useState(true);
  const [confirmarCierreServicio, setConfirmarCierreServicio] = useState(false);
  const [horarioActivo, setHorarioActivo] = useState(false);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('22:00');
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  
  // Auditoría
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);
  const [registrosAuditoria, setRegistrosAuditoria] = useState<RegistroAuditoria[]>([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);

  // ==============================
  // ESTADO: Zona de Cuarentena
  // ==============================
  const [zonaCuarentenaVisible, setZonaCuarentenaVisible] = useState(false);
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const [confirmacion1, setConfirmacion1] = useState('');
  const [confirmacion2, setConfirmacion2] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Estados para depuración de nómina
  const [tipoEliminacion, setTipoEliminacion] = useState<'periodo' | 'fecha'>('periodo');
  const [mesEliminacion, setMesEliminacion] = useState('ENERO');
  const [anioEliminacion, setAnioEliminacion] = useState(new Date().getFullYear());
  const [fechaInicioEliminacion, setFechaInicioEliminacion] = useState('');
  const [fechaFinEliminacion, setFechaFinEliminacion] = useState('');

  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  // ==============================
  // CARGAR ESTADO INICIAL
  // ==============================
  useEffect(() => {
    cargarEstadoAcceso();
  }, []);

  const cargarEstadoAcceso = async () => {
    setCargandoAcceso(true);
    try {
      const estado = await apiService.getEstadoControlAcceso();
      setEstadoAcceso(estado);
      if (estado.horario_acceso_activo) {
        setHorarioActivo(true);
        setHoraInicio(estado.horario_acceso_inicio || '08:00');
        setHoraFin(estado.horario_acceso_fin || '22:00');
      }
    } catch (error: any) {
      console.error('Error al cargar estado de acceso:', error);
      // Si es 403 FEATURE_NOT_AVAILABLE, mostrar como no disponible
      // Si es 500 u otro error, mostrar estado por defecto
      setEstadoAcceso({
        servicio_cerrado: false,
        servicio_cerrado_desde: null,
        servicio_cerrado_por: null,
        horario_acceso_activo: false,
        horario_acceso_inicio: null,
        horario_acceso_fin: null,
        plan_actual: 'basico',
        feature_disponible: false
      });
    } finally {
      setCargandoAcceso(false);
    }
  };

  const cargarAuditoria = async () => {
    setCargandoAuditoria(true);
    try {
      const data = await apiService.getAuditoriaAcceso(30);
      setRegistrosAuditoria(data.registros || []);
    } catch (error) {
      console.error('Error al cargar auditoría:', error);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  // ==============================
  // HANDLERS: Control de Acceso
  // ==============================
  const handleToggleServicio = async () => {
    if (!estadoAcceso) return;
    
    const activar = !estadoAcceso.servicio_cerrado;
    
    // Si va a cerrar, necesita confirmación
    if (activar && !confirmarCierreServicio) {
      setConfirmarCierreServicio(true);
      return;
    }

    setGuardandoServicio(true);
    try {
      const resultado = await apiService.toggleServicioCerrado(activar);
      setEstadoAcceso(resultado.estado);
      setConfirmarCierreServicio(false);
      alert(activar 
        ? '🔒 Servicio cerrado. Los empleados no podrán acceder hasta que lo abras.'
        : '🔓 Servicio abierto. Los empleados pueden acceder nuevamente.'
      );
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setGuardandoServicio(false);
    }
  };

  const handleGuardarHorario = async () => {
    setGuardandoHorario(true);
    try {
      const resultado = await apiService.configurarHorarioAcceso(
        horarioActivo,
        horarioActivo ? horaInicio : undefined,
        horarioActivo ? horaFin : undefined
      );
      setEstadoAcceso(resultado.estado);
      alert(horarioActivo 
        ? `⏰ Horario de acceso configurado: ${horaInicio} - ${horaFin}`
        : '⏰ Restricción de horario desactivada'
      );
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setGuardandoHorario(false);
    }
  };

  // ==============================
  // HANDLERS: Zona de Cuarentena
  // ==============================
  const handleEliminarHistorialNomina = async () => {
    if (confirmacion1 !== 'ELIMINAR NOMINA') {
      alert('Debes escribir "ELIMINAR NOMINA" para confirmar');
      return;
    }

    if (tipoEliminacion === 'fecha' && (!fechaInicioEliminacion || !fechaFinEliminacion)) {
      alert('Debes seleccionar las fechas de inicio y fin');
      return;
    }

    setProcesando(true);
    try {
      const data: any = { tipo: tipoEliminacion };
      if (tipoEliminacion === 'periodo') {
        data.periodo_mes = mesEliminacion;
        data.periodo_anio = anioEliminacion;
      } else {
        data.fecha_inicio = fechaInicioEliminacion;
        data.fecha_fin = fechaFinEliminacion;
      }

      const resultado = await apiService.eliminarHistorialNomina(data);
      alert(`✅ ${resultado.message}\nRegistros eliminados: ${resultado.deletedCount}`);
      cerrarModal();
    } catch (error: any) {
      alert(`❌ Error al eliminar historial: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleResetearSistemaComandas = async () => {
    if (confirmacion1 !== 'RESETEAR' || confirmacion2 !== 'CONFIRMAR') {
      alert('Debes escribir correctamente las palabras de confirmación');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.post('/sistema/resetear-sistema-comandas');
      alert(`✅ ${response.data.mensaje || 'Sistema de comandas reseteado exitosamente'}. Se recomienda recargar la página.`);
      window.location.reload();
    } catch (error: any) {
      alert(`❌ Error al resetear el sistema: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  const handleLiberarTodasMesas = async () => {
    if (confirmacion1 !== 'LIBERAR') {
      alert('Debes escribir "LIBERAR" para confirmar');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.post('/sistema/liberar-mesas');
      const data = response.data;
      alert(`✅ ${data.mensaje}\n${data.mesasLiberadas} mesa(s) liberada(s)\n${data.comandasEliminadas} comanda(s) eliminada(s)`);
      window.location.reload();
    } catch (error: any) {
      alert(`❌ Error al liberar las mesas: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  const handleLimpiarComandasAntiguas = async () => {
    if (confirmacion1 !== 'LIMPIAR') {
      alert('Debes escribir "LIMPIAR" para confirmar');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.post('/sistema/limpiar-comandas-antiguas');
      const data = response.data;
      alert(`✅ ${data.mensaje}\nComandas: ${data.comandas}\nFacturas: ${data.facturas}`);
      cerrarModal();
    } catch (error: any) {
      alert(`❌ Error al limpiar comandas antiguas: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleLimpiarSoloComandas = async () => {
    if (confirmacion1 !== 'ELIMINAR') {
      alert('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.post('/sistema/limpiar-solo-comandas');
      const data = response.data;
      alert(`✅ ${data.mensaje}\n\nDetalles:\n- Comandas eliminadas: ${data.comandas}\n- Facturas eliminadas: ${data.facturas}\n- Items eliminados: ${data.items}\n- Mesas liberadas: ${data.mesasLiberadas}`);
      window.location.reload();
    } catch (error: any) {
      alert(`❌ Error al limpiar comandas: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  const abrirModal = (tipo: string) => {
    setModalAbierto(tipo);
    setConfirmacion1('');
    setConfirmacion2('');
  };

  const cerrarModal = () => {
    setModalAbierto(null);
    setConfirmacion1('');
    setConfirmacion2('');
  };

  // ==============================
  // HELPER: Formato fecha auditoría
  // ==============================
  const formatearFechaAuditoria = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleString('es-CO', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getAccionLabel = (accion: string) => {
    const labels: Record<string, { text: string; color: string; icon: typeof Lock }> = {
      'servicio_cerrado_activado': { text: 'Servicio cerrado', color: 'text-red-600', icon: Lock },
      'servicio_cerrado_desactivado': { text: 'Servicio abierto', color: 'text-green-600', icon: Unlock },
      'horario_acceso_modificado': { text: 'Horario modificado', color: 'text-blue-600', icon: Clock },
      'acceso_bloqueado_servicio_cerrado': { text: 'Acceso bloqueado (servicio)', color: 'text-orange-600', icon: Ban },
      'acceso_bloqueado_fuera_horario': { text: 'Acceso bloqueado (horario)', color: 'text-orange-600', icon: Clock },
    };
    return labels[accion] || { text: accion, color: 'text-gray-600', icon: Eye };
  };

  // ==============================
  // DATOS: Herramientas Zona Cuarentena
  // ==============================
  const herramientas = [
    {
      id: 'liberar-mesas',
      titulo: 'Liberar Todas las Mesas',
      descripcion: 'Marca todas las mesas como disponibles y elimina las comandas activas.',
      icon: Coffee,
      peligro: 'medio' as const,
      accion: handleLiberarTodasMesas
    },
    {
      id: 'limpiar-solo-comandas',
      titulo: 'Limpiar SOLO Comandas',
      descripcion: 'Elimina TODAS las comandas y facturas, dejando intactos productos, mesas y personalizaciones.',
      icon: Trash2,
      peligro: 'alto' as const,
      accion: handleLimpiarSoloComandas
    },
    {
      id: 'limpiar-comandas',
      titulo: 'Limpiar Comandas Antiguas',
      descripcion: 'Elimina comandas y facturas con 30 días o más.',
      icon: RefreshCw,
      peligro: 'medio' as const,
      accion: handleLimpiarComandasAntiguas
    },
    {
      id: 'eliminar-historial-nomina',
      titulo: 'Depurar Historial de Nómina',
      descripcion: 'Elimina registros de nómina, pagos e historial por periodo o fechas.',
      icon: FileX,
      peligro: 'alto' as const,
      accion: handleEliminarHistorialNomina
    },
    {
      id: 'resetear-sistema',
      titulo: 'Resetear Sistema de Comandas',
      descripcion: '⚠️ PELIGRO: Elimina TODOS los datos (comandas, facturas, productos, etc.). IRREVERSIBLE.',
      icon: Database,
      peligro: 'alto' as const,
      accion: handleResetearSistemaComandas
    }
  ];

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className="space-y-8">
      
      {/* ============================================ */}
      {/* SECCIÓN 1: CONTROL DE ACCESO (SERVICIO CERRADO) */}
      {/* ============================================ */}
      {!cargandoAcceso && estadoAcceso?.feature_disponible && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-50 px-6 py-4 border-b-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-indigo-900">Control de Acceso</h3>
                  <p className="text-sm text-indigo-600">
                    Gestiona el cierre de servicio y horarios de acceso
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Plan Profesional
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* === Estado del Servicio === */}
            <div className={`rounded-xl p-6 border-2 transition-all ${
              estadoAcceso.servicio_cerrado 
                ? 'bg-red-50 border-red-300' 
                : 'bg-green-50 border-green-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    estadoAcceso.servicio_cerrado ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {estadoAcceso.servicio_cerrado 
                      ? <Lock className="h-6 w-6 text-red-600" />
                      : <Unlock className="h-6 w-6 text-green-600" />
                    }
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold ${
                      estadoAcceso.servicio_cerrado ? 'text-red-800' : 'text-green-800'
                    }`}>
                      {estadoAcceso.servicio_cerrado ? '🔒 Servicio Cerrado' : '🔓 Servicio Abierto'}
                    </h4>
                    <p className={`text-sm ${
                      estadoAcceso.servicio_cerrado ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {estadoAcceso.servicio_cerrado 
                        ? `Cerrado desde ${estadoAcceso.servicio_cerrado_desde 
                            ? formatearFechaAuditoria(estadoAcceso.servicio_cerrado_desde)
                            : 'hace un momento'
                          }${estadoAcceso.servicio_cerrado_por_nombre 
                            ? ` por ${estadoAcceso.servicio_cerrado_por_nombre}` 
                            : ''
                          }`
                        : 'Los empleados pueden acceder normalmente'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {/* Botón principal */}
                  {!confirmarCierreServicio ? (
                    <button
                      onClick={handleToggleServicio}
                      disabled={guardandoServicio}
                      className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                        estadoAcceso.servicio_cerrado
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      } disabled:opacity-50`}
                    >
                      <Power className="h-4 w-4" />
                      <span>{estadoAcceso.servicio_cerrado ? 'Abrir Servicio' : 'Cerrar Servicio'}</span>
                    </button>
                  ) : (
                    /* Confirmación de cierre */
                    <div className="bg-red-100 rounded-lg p-4 border border-red-300">
                      <p className="text-sm text-red-800 font-semibold mb-2">
                        ⚠️ ¿Seguro que quieres cerrar el servicio?
                      </p>
                      <p className="text-xs text-red-700 mb-3">
                        Los empleados no podrán iniciar sesión ni usar el sistema.
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleToggleServicio}
                          disabled={guardandoServicio}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          {guardandoServicio ? 'Cerrando...' : 'Sí, cerrar'}
                        </button>
                        <button
                          onClick={() => setConfirmarCierreServicio(false)}
                          className="px-4 py-2 bg-white text-red-700 rounded-lg text-sm font-medium border border-red-300 hover:bg-red-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === Horario de Acceso === */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-blue-800">Horario de Acceso</h4>
                    <p className="text-sm text-blue-600">
                      Restringe el acceso de empleados a un rango horario
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Toggle de horario */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div 
                    onClick={() => setHorarioActivo(!horarioActivo)}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                      horarioActivo ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      horarioActivo ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm font-medium text-blue-800">
                    {horarioActivo ? 'Horario de acceso activo' : 'Sin restricción de horario'}
                  </span>
                </label>

                {/* Inputs de hora */}
                {horarioActivo && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Hora de apertura</label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Hora de cierre</label>
                      <input
                        type="time"
                        value={horaFin}
                        onChange={(e) => setHoraFin(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Nota:</strong> El horario aplica a todos los usuarios excepto el administrador. 
                    Se usa la hora de Colombia (América/Bogotá).
                    {horarioActivo && horaInicio > horaFin && (
                      <span className="block mt-1 italic">
                        El rango cruza medianoche — se permitirá acceso de {horaInicio} a 23:59 y de 00:00 a {horaFin}.
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={handleGuardarHorario}
                  disabled={guardandoHorario}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {guardandoHorario ? 'Guardando...' : 'Guardar Horario'}
                </button>
              </div>
            </div>

            {/* === Registro de Auditoría === */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => {
                  setMostrarAuditoria(!mostrarAuditoria);
                  if (!mostrarAuditoria && registrosAuditoria.length === 0) cargarAuditoria();
                }}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <History className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Registro de Auditoría</span>
                </div>
                {mostrarAuditoria ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {mostrarAuditoria && (
                <div className="px-6 pb-6 border-t">
                  {cargandoAuditoria ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-gray-500">Cargando registros...</span>
                    </div>
                  ) : registrosAuditoria.length === 0 ? (
                    <p className="text-gray-500 py-4 text-center text-sm">No hay registros de auditoría aún</p>
                  ) : (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      {registrosAuditoria.map((reg) => {
                        const label = getAccionLabel(reg.accion);
                        const Icon = label.icon;
                        return (
                          <div key={reg.id} className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-50">
                            <Icon className={`h-4 w-4 ${label.color} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
                              {reg.detalles?.rango_permitido && (
                                <span className="text-xs text-gray-500 ml-2">{reg.detalles.rango_permitido}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatearFechaAuditoria(reg.created_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature no disponible (plan básico) */}
      {!cargandoAcceso && estadoAcceso && !estadoAcceso.feature_disponible && (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-500 mb-2">Control de Acceso</h3>
          <p className="text-gray-400 text-sm mb-4">
            Cierre de servicio y restricción por horario.<br />
            Disponible en el <strong>Plan Profesional</strong>.
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
            Actualiza tu plan para desbloquear
          </span>
        </div>
      )}

      {/* ============================================ */}
      {/* SECCIÓN 2: ZONA DE CUARENTENA */}
      {/* ============================================ */}
      <div className="rounded-xl border-2 border-red-200 overflow-hidden">
        {/* Toggle para mostrar/ocultar */}
        <button
          onClick={() => setZonaCuarentenaVisible(!zonaCuarentenaVisible)}
          className="w-full bg-red-50 px-6 py-4 flex items-center justify-between hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-red-800">Zona de Cuarentena</h3>
              <p className="text-sm text-red-600">
                Operaciones irreversibles y herramientas de alto riesgo
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-1 rounded-full">
              {herramientas.length} herramientas
            </span>
            {zonaCuarentenaVisible 
              ? <ChevronUp className="h-5 w-5 text-red-400" />
              : <ChevronDown className="h-5 w-5 text-red-400" />
            }
          </div>
        </button>

        {zonaCuarentenaVisible && (
          <div className="p-6 bg-white">
            {/* Advertencia */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">
                  Las herramientas de esta sección pueden eliminar datos críticos del sistema de forma <strong>permanente</strong>.
                  Lee cuidadosamente las descripciones. Se recomienda realizar respaldos antes de ejecutar operaciones destructivas.
                </p>
              </div>
            </div>

            {/* Grid de herramientas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {herramientas.map((herramienta) => {
                const Icon = herramienta.icon;
                const isAlto = herramienta.peligro === 'alto';
                return (
                  <div
                    key={herramienta.id}
                    className={`border-2 rounded-lg p-5 transition-all ${
                      isAlto 
                        ? 'border-red-200 hover:border-red-300 bg-red-50' 
                        : 'border-yellow-200 hover:border-yellow-300 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start mb-3">
                      <div className={`p-2 rounded-lg bg-white ${isAlto ? 'text-red-600' : 'text-yellow-600'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="ml-auto">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isAlto ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isAlto ? 'PELIGRO' : 'PRECAUCIÓN'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-secondary-800 mb-1">{herramienta.titulo}</h4>
                    <p className="text-xs text-secondary-600 mb-3 leading-relaxed">{herramienta.descripcion}</p>

                    <button
                      onClick={() => abrirModal(herramienta.id)}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-white ${
                        isAlto ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                    >
                      Ejecutar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* MODALES DE CONFIRMACIÓN */}
      {/* ============================================ */}

      {/* Modal: Liberar Mesas */}
      {modalAbierto === 'liberar-mesas' && (
        <ModalConfirmacion
          titulo="Liberar Todas las Mesas"
          icon={<Coffee className="h-8 w-8 text-yellow-600" />}
          color="yellow"
          descripcion="Esta acción marcará todas las mesas como disponibles y eliminará todas las comandas activas (pendientes, en preparación, listas y entregadas)."
          palabraConfirmacion="LIBERAR"
          confirmacion={confirmacion1}
          setConfirmacion={setConfirmacion1}
          procesando={procesando}
          onConfirmar={handleLiberarTodasMesas}
          onCancelar={cerrarModal}
        />
      )}

      {/* Modal: Limpiar Comandas Antiguas */}
      {modalAbierto === 'limpiar-comandas' && (
        <ModalConfirmacion
          titulo="Limpiar Comandas Antiguas"
          icon={<RefreshCw className="h-8 w-8 text-yellow-600" />}
          color="yellow"
          descripcion="Se eliminarán todas las comandas y facturas con 30 días o más de antigüedad."
          palabraConfirmacion="LIMPIAR"
          confirmacion={confirmacion1}
          setConfirmacion={setConfirmacion1}
          procesando={procesando}
          onConfirmar={handleLimpiarComandasAntiguas}
          onCancelar={cerrarModal}
        />
      )}

      {/* Modal: Limpiar SOLO Comandas */}
      {modalAbierto === 'limpiar-solo-comandas' && (
        <ModalConfirmacion
          titulo="Limpiar SOLO Comandas"
          icon={<Trash2 className="h-8 w-8 text-orange-600" />}
          color="red"
          descripcion="Eliminará TODAS las comandas, facturas e historial de ventas. NO eliminará productos, mesas ni personalizaciones."
          palabraConfirmacion="ELIMINAR"
          confirmacion={confirmacion1}
          setConfirmacion={setConfirmacion1}
          procesando={procesando}
          onConfirmar={handleLimpiarSoloComandas}
          onCancelar={cerrarModal}
        />
      )}

      {/* Modal: Resetear Sistema (doble confirmación) */}
      {modalAbierto === 'resetear-sistema' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-bold text-red-800">⚠️ PELIGRO: Resetear Base de Datos</h3>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-800 text-sm font-semibold mb-2">Esta acción es IRREVERSIBLE:</p>
              <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                <li>Todas las comandas y facturas</li>
                <li>Todos los productos y categorías</li>
                <li>Todas las mesas y salones</li>
                <li>TODO el contenido de la base de datos</li>
              </ul>
            </div>

            <p className="text-secondary-700 mb-2 font-semibold">1. Escribe <strong className="text-red-600">RESETEAR</strong>:</p>
            <input
              type="text" value={confirmacion1} onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: RESETEAR"
              className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 focus:ring-2 focus:ring-red-500"
              disabled={procesando}
            />

            <p className="text-secondary-700 mb-2 font-semibold">2. Escribe <strong className="text-red-600">CONFIRMAR</strong>:</p>
            <input
              type="text" value={confirmacion2} onChange={(e) => setConfirmacion2(e.target.value)}
              placeholder="Escribe: CONFIRMAR"
              className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 focus:ring-2 focus:ring-red-500"
              disabled={procesando || confirmacion1 !== 'RESETEAR'}
            />

            <div className="flex space-x-3">
              <button onClick={handleResetearSistemaComandas} disabled={confirmacion1 !== 'RESETEAR' || confirmacion2 !== 'CONFIRMAR' || procesando}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 font-semibold">
                {procesando ? 'Reseteando...' : 'RESETEAR SISTEMA'}
              </button>
              <button onClick={cerrarModal} disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Historial Nómina */}
      {modalAbierto === 'eliminar-historial-nomina' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <FileX className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-bold text-red-800">Depurar Historial de Nómina</h3>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-800 text-sm">
                Eliminará permanentemente nóminas, pagos y auditorías que coincidan con el criterio seleccionado.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Eliminación:</label>
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" checked={tipoEliminacion === 'periodo'} onChange={() => setTipoEliminacion('periodo')} className="mr-2" />
                  Por Periodo (Mes/Año)
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" checked={tipoEliminacion === 'fecha'} onChange={() => setTipoEliminacion('fecha')} className="mr-2" />
                  Por Rango de Fechas
                </label>
              </div>

              {tipoEliminacion === 'periodo' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mes</label>
                    <select value={mesEliminacion} onChange={(e) => setMesEliminacion(e.target.value)}
                      className="w-full border p-2 rounded focus:ring-red-500">
                      {meses.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Año</label>
                    <input type="number" value={anioEliminacion} onChange={(e) => setAnioEliminacion(parseInt(e.target.value))}
                      className="w-full border p-2 rounded focus:ring-red-500" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Desde</label>
                    <input type="date" value={fechaInicioEliminacion} onChange={(e) => setFechaInicioEliminacion(e.target.value)}
                      className="w-full border p-2 rounded focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                    <input type="date" value={fechaFinEliminacion} onChange={(e) => setFechaFinEliminacion(e.target.value)}
                      className="w-full border p-2 rounded focus:ring-red-500" />
                  </div>
                </div>
              )}
            </div>

            <p className="text-secondary-700 mb-2 font-semibold">
              Escribe <strong className="text-red-600">ELIMINAR NOMINA</strong>:
            </p>
            <input type="text" value={confirmacion1} onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: ELIMINAR NOMINA"
              className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 focus:ring-2 focus:ring-red-500"
              disabled={procesando} />

            <div className="flex space-x-3">
              <button onClick={handleEliminarHistorialNomina} disabled={confirmacion1 !== 'ELIMINAR NOMINA' || procesando}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 font-semibold">
                {procesando ? 'Eliminando...' : 'Eliminar Historial'}
              </button>
              <button onClick={cerrarModal} disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================
// COMPONENTE: Modal de Confirmación Reutilizable
// ==============================
function ModalConfirmacion({
  titulo, icon, color, descripcion, palabraConfirmacion,
  confirmacion, setConfirmacion, procesando,
  onConfirmar, onCancelar
}: {
  titulo: string;
  icon: React.ReactNode;
  color: 'yellow' | 'red';
  descripcion: string;
  palabraConfirmacion: string;
  confirmacion: string;
  setConfirmacion: (v: string) => void;
  procesando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const colors = color === 'red' 
    ? { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', btn: 'bg-red-600 hover:bg-red-700', ring: 'focus:ring-red-500', borderInput: 'border-red-300' }
    : { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800', btn: 'bg-yellow-600 hover:bg-yellow-700', ring: 'focus:ring-yellow-500', borderInput: 'border-secondary-300' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          {icon}
          <h3 className={`text-xl font-bold ${colors.text} ml-3`}>{titulo}</h3>
        </div>

        <div className={`${colors.bg} border-l-4 ${colors.border} p-4 mb-4`}>
          <p className={`${colors.text} text-sm`}>{descripcion}</p>
        </div>

        <p className="text-secondary-700 mb-4">
          Para confirmar, escribe <strong>{palabraConfirmacion}</strong>:
        </p>

        <input
          type="text" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)}
          placeholder={`Escribe: ${palabraConfirmacion}`}
          className={`w-full px-3 py-2 border ${colors.borderInput} rounded-md mb-4 focus:outline-none focus:ring-2 ${colors.ring}`}
          disabled={procesando}
        />

        <div className="flex space-x-3">
          <button onClick={onConfirmar} disabled={confirmacion !== palabraConfirmacion || procesando}
            className={`flex-1 ${colors.btn} text-white px-4 py-2 rounded-md disabled:opacity-50 transition-colors font-medium`}>
            {procesando ? 'Procesando...' : 'Confirmar'}
          </button>
          <button onClick={onCancelar} disabled={procesando}
            className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
