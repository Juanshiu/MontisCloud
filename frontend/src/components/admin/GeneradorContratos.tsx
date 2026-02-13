
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Empleado, ContratoDetails, ContratoHistorico, VariablesDisponibles, PlantillaContrato } from '@/types';
import { 
  FileText, 
  User, 
  Briefcase,
  Download,
  History,
  RefreshCw,
  Printer,
  Trash2,
  Code,
  Building2,
  UserCheck,
  ScrollText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  EyeOff,
  Save,
  Star,
  Plus,
  Edit3,
  FolderOpen,
  Check,
  X,
  Bold,
  Italic,
  Underline,
  List,
  Shield
} from 'lucide-react';

// ==================== CONSTANTES ====================

const PLANTILLA_FALLBACK = `CONTRATO DE TRABAJO

Entre {{NOMBRE_EMPLEADOR}} (NIT: {{IDENTIFICACION_EMPLEADOR}}) y {{NOMBRE_TRABAJADOR}} (C.C. {{CEDULA_TRABAJADOR}}).

Cargo: {{CARGO}}
Salario: {{SALARIO}}
Duración: {{DURACION_CONTRATO}}
Inicio: {{FECHA_INICIO}} - Fin: {{FECHA_FIN}}

Firmado en {{LUGAR_FIRMA}}, {{FECHA_FIRMA}}`;

const VARIABLES_FALLBACK: VariablesDisponibles = {
  empresa: [
    { variable: '{{NOMBRE_EMPLEADOR}}', descripcion: 'Nombre / Razón social del empleador' },
    { variable: '{{IDENTIFICACION_EMPLEADOR}}', descripcion: 'NIT o cédula del empleador' },
    { variable: '{{RAZON_SOCIAL}}', descripcion: 'Razón social del establecimiento' },
    { variable: '{{DIRECCION_EMPRESA}}', descripcion: 'Dirección de la empresa' },
    { variable: '{{MUNICIPIO_EMPRESA}}', descripcion: 'Municipio de la empresa' },
  ],
  empleado: [
    { variable: '{{NOMBRE_TRABAJADOR}}', descripcion: 'Nombre completo del trabajador' },
    { variable: '{{CEDULA_TRABAJADOR}}', descripcion: 'Cédula del trabajador' },
    { variable: '{{DIRECCION_TRABAJADOR}}', descripcion: 'Dirección del trabajador' },
    { variable: '{{MUNICIPIO_TRABAJADOR}}', descripcion: 'Municipio del trabajador' },
    { variable: '{{CARGO}}', descripcion: 'Cargo del trabajador' },
    { variable: '{{SALARIO}}', descripcion: 'Salario formateado ($X.XXX.XXX)' },
    { variable: '{{SALARIO_LETRAS}}', descripcion: 'Salario en letras (PESOS M/CTE)' },
  ],
  contrato: [
    { variable: '{{TIPO_CONTRATO}}', descripcion: 'Tipo de contrato' },
    { variable: '{{DURACION_CONTRATO}}', descripcion: 'Duración del contrato' },
    { variable: '{{FECHA_INICIO}}', descripcion: 'Fecha de inicio (formato legible)' },
    { variable: '{{FECHA_FIN}}', descripcion: 'Fecha de finalización (formato legible)' },
    { variable: '{{PERIODO_PRUEBA}}', descripcion: 'Período de prueba' },
    { variable: '{{DIAS_LABORADOS}}', descripcion: 'Días laborados semanalmente' },
    { variable: '{{HORARIO_TRABAJO}}', descripcion: 'Horario de trabajo' },
    { variable: '{{FORMA_PAGO}}', descripcion: 'Forma de pago' },
    { variable: '{{PERIODO_PAGO}}', descripcion: 'Período de pago' },
    { variable: '{{FECHAS_PAGO}}', descripcion: 'Días específicos de pago' },
    { variable: '{{LUGAR_FIRMA}}', descripcion: 'Lugar de firma del contrato' },
    { variable: '{{FECHA_FIRMA}}', descripcion: 'Fecha de firma (formato legible)' },
  ]
};

const MAX_TEMPLATE_LENGTH = 50000;

// ==================== COMPONENTE PANEL DE VARIABLES ====================

interface VariablesPanelProps {
  variables: VariablesDisponibles;
  onInsertVariable: (variable: string) => void;
}

const VariablesPanel: React.FC<VariablesPanelProps> = ({ variables, onInsertVariable }) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('empresa');

  const grupos = [
    { key: 'empresa', label: 'Empresa', icon: Building2, items: variables.empresa, color: 'blue' },
    { key: 'empleado', label: 'Empleado', icon: UserCheck, items: variables.empleado, color: 'green' },
    { key: 'contrato', label: 'Detalles del Contrato', icon: ScrollText, items: variables.contrato, color: 'purple' },
  ];

  const colorClasses: Record<string, { bg: string; hover: string; border: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
    green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
    purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500' },
  };

  return (
    <div className="space-y-2">
      {grupos.map(grupo => {
        const isExpanded = expandedGroup === grupo.key;
        const colors = colorClasses[grupo.color];
        const Icon = grupo.icon;
        return (
          <div key={grupo.key} className={`border rounded-md ${colors.border}`}>
            <button
              type="button"
              onClick={() => setExpandedGroup(isExpanded ? null : grupo.key)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium ${colors.bg} ${colors.text} rounded-t-md`}
            >
              <span className="flex items-center">
                <Icon className={`h-4 w-4 mr-2 ${colors.icon}`} />
                {grupo.label}
                <span className="ml-1 text-xs opacity-60">({grupo.items.length})</span>
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isExpanded && (
              <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                {grupo.items.map(item => (
                  <button
                    key={item.variable}
                    type="button"
                    onClick={() => onInsertVariable(item.variable)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded ${colors.hover} transition-colors group`}
                    title={`Insertar ${item.variable}`}
                  >
                    <code className={`font-mono text-xs ${colors.text} font-semibold`}>{item.variable}</code>
                    <p className="text-gray-500 text-[10px] mt-0.5 leading-tight">{item.descripcion}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const GeneradorContratos: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fetchingHistorial, setFetchingHistorial] = useState(false);
  const [historial, setHistorial] = useState<ContratoHistorico[]>([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string>('');
  const [contratoUrl, setContratoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado de la plantilla
  const [templateText, setTemplateText] = useState<string>('');
  const [plantillaDefault, setPlantillaDefault] = useState<string>('');
  const [variablesDisponibles, setVariablesDisponibles] = useState<VariablesDisponibles>(VARIABLES_FALLBACK);
  const [showEditor, setShowEditor] = useState(false);
  const [loadingPlantilla, setLoadingPlantilla] = useState(true);
  const [origenPlantilla, setOrigenPlantilla] = useState<'empresa' | 'archivo'>('archivo');

  // Estado de gestión de plantillas guardadas
  const [plantillasGuardadas, setPlantillasGuardadas] = useState<PlantillaContrato[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [showGuardarModal, setShowGuardarModal] = useState(false);
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('');
  const [guardarComoDefault, setGuardarComoDefault] = useState(false);
  const [savingPlantilla, setSavingPlantilla] = useState(false);
  const [showGestorPlantillas, setShowGestorPlantillas] = useState(false);
  const [editandoPlantillaId, setEditandoPlantillaId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');

  // Ref para el textarea del editor
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Helper para formatear fechas (DD/MM/YYYY)
  const formatearFecha = (fechaStr: string | null | undefined): string => {
    if (!fechaStr) return '';
    try {
      const soloFecha = fechaStr.split('T')[0];
      const [year, month, day] = soloFecha.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  // Initial Form State
  const initialFormState: ContratoDetails = {
    TIPO_CONTRATO: 'TÉRMINO FIJO INFERIOR A UN (1) AÑO',
    DURACION_CONTRATO: '6 MESES',
    FECHA_INICIO: new Date().toISOString().split('T')[0],
    FECHA_FIN: '',
    PERIODO_PRUEBA: '2 MESES',
    DIAS_LABORADOS: 'LUNES A SÁBADO',
    HORARIO_TRABAJO: '8:00 AM - 5:00 PM',
    FORMA_PAGO: 'TRANSFERENCIA BANCARIA',
    PERIODO_PAGO: 'QUINCENAL',
    FECHAS_PAGO: '15 Y 30 DE CADA MES',
    LUGAR_FIRMA: 'PALERMO, HUILA',
    FECHA_FIRMA: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState<ContratoDetails>(initialFormState);

  // Cargar datos al montar
  useEffect(() => {
    fetchEmpleados();
    fetchPlantillaDefault();
    fetchPlantillasGuardadas();
  }, []);

  const fetchPlantillaDefault = async () => {
    try {
      setLoadingPlantilla(true);
      const data = await apiService.getPlantillaDefault();
      setPlantillaDefault(data.plantilla);
      setTemplateText(data.plantilla);
      setVariablesDisponibles(data.variables);
      setOrigenPlantilla(data.origen || 'archivo');
    } catch (err) {
      console.error('Error cargando plantilla por defecto:', err);
      setPlantillaDefault(PLANTILLA_FALLBACK);
      setTemplateText(PLANTILLA_FALLBACK);
    } finally {
      setLoadingPlantilla(false);
    }
  };

  const fetchPlantillasGuardadas = async () => {
    try {
      setLoadingPlantillas(true);
      const data = await apiService.getPlantillas();
      setPlantillasGuardadas(data);
    } catch (err) {
      // Puede fallar si la tabla aún no existe
      console.warn('No se pudieron cargar plantillas guardadas:', err);
      setPlantillasGuardadas([]);
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEmpleados();
      const activos = data.filter(e => e.estado === 'ACTIVO');
      setEmpleados(activos);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async (empleadoId: string) => {
    try {
      setFetchingHistorial(true);
      const data = await apiService.getContratosHistorial(empleadoId);
      setHistorial(data);
    } catch (err) {
      console.error('Error fetching contract history:', err);
    } finally {
      setFetchingHistorial(false);
    }
  };

  const handleEmpleadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedEmpleadoId(id);
    setContratoUrl(null);
    setSuccess(null);
    setError(null);
    setHistorial([]);

    if (id) {
      fetchHistorial(id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Insertar variable en la posición actual del cursor del editor
  const insertarVariable = useCallback((variable: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = templateText;

    const newText = currentText.substring(0, start) + variable + currentText.substring(end);
    setTemplateText(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [templateText]);

  // Envolver texto seleccionado con marcadores de estilo
  const wrapSelectedText = useCallback((prefix: string, suffix: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateText;
    const selected = text.substring(start, end);

    if (selected) {
      const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
      setTemplateText(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      });
    } else {
      const newText = text.substring(0, start) + prefix + suffix + text.substring(end);
      setTemplateText(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      });
    }
  }, [templateText]);

  // Insertar viñeta (- ) al inicio de la línea actual
  const insertBulletAtLine = useCallback(() => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const text = templateText;
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const newText = text.substring(0, lineStart) + '- ' + text.substring(lineStart);
    setTemplateText(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(pos + 2, pos + 2);
    });
  }, [templateText]);

  // Restaurar plantilla por defecto
  const restaurarPlantillaDefault = () => {
    if (window.confirm('¿Restaurar la plantilla por defecto? Se perderán los cambios actuales.')) {
      setTemplateText(plantillaDefault);
    }
  };

  // Cargar una plantilla guardada al editor
  const cargarPlantillaGuardada = (plantilla: PlantillaContrato) => {
    setTemplateText(plantilla.contenido);
    setShowEditor(true);
    setSuccess(`Plantilla "${plantilla.nombre}" cargada en el editor.`);
  };

  // Guardar plantilla actual como nueva
  const handleGuardarPlantilla = async () => {
    if (!nombreNuevaPlantilla.trim()) {
      setError('Ingresa un nombre para la plantilla');
      return;
    }
    if (!templateText.trim()) {
      setError('La plantilla no puede estar vacía');
      return;
    }

    try {
      setSavingPlantilla(true);
      setError(null);
      await apiService.crearPlantilla(nombreNuevaPlantilla.trim(), templateText, guardarComoDefault);
      setSuccess(`Plantilla "${nombreNuevaPlantilla}" guardada correctamente${guardarComoDefault ? ' como predeterminada' : ''}`);
      setShowGuardarModal(false);
      setNombreNuevaPlantilla('');
      setGuardarComoDefault(false);

      // Recargar plantillas y default
      await Promise.all([fetchPlantillasGuardadas(), fetchPlantillaDefault()]);
    } catch (err: any) {
      console.error('Error guardando plantilla:', err);
      setError(err.response?.data?.error || 'Error al guardar la plantilla');
    } finally {
      setSavingPlantilla(false);
    }
  };

  // Actualizar contenido de una plantilla existente
  const handleActualizarPlantilla = async (id: string) => {
    try {
      setSavingPlantilla(true);
      setError(null);
      await apiService.actualizarPlantilla(id, { contenido: templateText });
      setSuccess('Plantilla actualizada correctamente');
      await Promise.all([fetchPlantillasGuardadas(), fetchPlantillaDefault()]);
    } catch (err: any) {
      console.error('Error actualizando plantilla:', err);
      setError(err.response?.data?.error || 'Error al actualizar la plantilla');
    } finally {
      setSavingPlantilla(false);
    }
  };

  // Renombrar plantilla 
  const handleRenombrarPlantilla = async (id: string) => {
    if (!editandoNombre.trim()) return;
    try {
      await apiService.actualizarPlantilla(id, { nombre: editandoNombre.trim() });
      setEditandoPlantillaId(null);
      setEditandoNombre('');
      await fetchPlantillasGuardadas();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al renombrar');
    }
  };

  // Establecer plantilla como default
  const handleSetDefault = async (id: string) => {
    try {
      await apiService.setPlantillaDefault(id);
      setSuccess('Plantilla establecida como predeterminada');
      await Promise.all([fetchPlantillasGuardadas(), fetchPlantillaDefault()]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al establecer como predeterminada');
    }
  };

  // Eliminar plantilla guardada
  const handleEliminarPlantilla = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar la plantilla "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiService.eliminarPlantilla(id);
      setSuccess(`Plantilla "${nombre}" eliminada`);
      await Promise.all([fetchPlantillasGuardadas(), fetchPlantillaDefault()]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar plantilla');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpleadoId) {
      setError('Por favor seleccione un empleado');
      return;
    }

    if (templateText.length > MAX_TEMPLATE_LENGTH) {
      setError(`La plantilla excede el límite de ${MAX_TEMPLATE_LENGTH.toLocaleString()} caracteres (actual: ${templateText.length.toLocaleString()})`);
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      setContratoUrl(null);

      const response = await apiService.generarContrato(
        selectedEmpleadoId, 
        formData,
        templateText || undefined
      );
      
      if (response.success) {
        setSuccess('Contrato generado y guardado correctamente');
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        setContratoUrl(`${baseUrl}${response.url}`);
        
        if (selectedEmpleadoId) {
          fetchHistorial(selectedEmpleadoId);
        }
      }
    } catch (err: any) {
      console.error('Error generating contract:', err);
      const errorData = err.response?.data;
      // Si el PDF se generó pero hubo error en historial, mostrar advertencia naranja
      if (errorData?.url) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        setContratoUrl(`${baseUrl}${errorData.url}`);
        setError(`${errorData.error || 'Error parcial'}. El PDF se generó pero puede haber un problema con el historial.`);
      } else {
        setError(errorData?.error || 'Error al generar el contrato');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleReprint = (contrato: ContratoHistorico) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/contratos/download/${contrato.file_name}`;
    window.open(url, '_blank');
  };

  const handleRenew = (contrato: ContratoHistorico) => {
    setFormData({
      ...contrato.contrato_details,
      FECHA_INICIO: new Date().toISOString().split('T')[0],
      FECHA_FIRMA: new Date().toISOString().split('T')[0]
    });
    if (contrato.contrato_template) {
      setTemplateText(contrato.contrato_template);
      setShowEditor(true);
    }
    setSuccess(`Datos del contrato "${contrato.tipo_contrato}" cargados para renovación.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este contrato? Esta acción no se puede deshacer.')) return;
    try {
      setLoading(true);
      await apiService.deleteContrato(id);
      setSuccess('Contrato eliminado correctamente');
      if (selectedEmpleadoId) {
        fetchHistorial(selectedEmpleadoId);
      }
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      setError(err.response?.data?.error || 'Error al eliminar el contrato');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpleado = empleados.find(e => e.id === selectedEmpleadoId);
  const templateModificada = templateText !== plantillaDefault;
  const charCount = templateText.length;
  const charPercent = Math.round((charCount / MAX_TEMPLATE_LENGTH) * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6 border-b pb-4">
        <FileText className="h-8 w-8 text-indigo-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Generador de Contratos Laborales</h2>
          <p className="text-gray-500 text-sm">Crea contratos en PDF con plantillas personalizables y variables automáticas</p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
              {contratoUrl && (
                <div className="mt-2">
                  <a 
                    href={contratoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Descargar Contrato PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ============ COLUMNA IZQUIERDA ============ */}
          <div className="space-y-6">
            {/* Selección de Empleado */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-indigo-500" />
                1. Selección de Empleado
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Empleado</label>
                  <select
                    value={selectedEmpleadoId}
                    onChange={handleEmpleadoChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    required
                  >
                    <option value="">Seleccione un empleado...</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombres} {emp.apellidos} - {emp.numero_documento}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedEmpleado && (
                  <div className="bg-white p-3 rounded border text-sm text-gray-600 flex justify-between items-center">
                    <div>
                      <p><strong>Cargo:</strong> {selectedEmpleado.cargo}</p>
                      <p><strong>Documento:</strong> {selectedEmpleado.numero_documento}</p>
                    </div>
                    <div>
                      <p><strong>Salario Base:</strong> ${selectedEmpleado.salario_base.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detalles del Contrato */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-indigo-500" />
                2. Detalles del Contrato
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Contrato</label>
                  <input type="text" name="TIPO_CONTRATO" value={formData.TIPO_CONTRATO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duración</label>
                  <input type="text" name="DURACION_CONTRATO" value={formData.DURACION_CONTRATO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Período de Prueba</label>
                  <input type="text" name="PERIODO_PRUEBA" value={formData.PERIODO_PRUEBA} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                  <input type="date" name="FECHA_INICIO" value={formData.FECHA_INICIO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                  <input type="date" name="FECHA_FIN" value={formData.FECHA_FIN} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Días Laborados</label>
                  <input type="text" name="DIAS_LABORADOS" value={formData.DIAS_LABORADOS} onChange={handleInputChange} placeholder="Ej: Lunes a Sábado"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Horario de Trabajo</label>
                  <input type="text" name="HORARIO_TRABAJO" value={formData.HORARIO_TRABAJO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
                  <input type="text" name="FORMA_PAGO" value={formData.FORMA_PAGO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Período de Pago</label>
                  <input type="text" name="PERIODO_PAGO" value={formData.PERIODO_PAGO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Fechas de Pago</label>
                  <input type="text" name="FECHAS_PAGO" value={formData.FECHAS_PAGO} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lugar de Firma</label>
                  <input type="text" name="LUGAR_FIRMA" value={formData.LUGAR_FIRMA} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Firma</label>
                  <input type="date" name="FECHA_FIRMA" value={formData.FECHA_FIRMA} onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                </div>
              </div>
            </div>
          </div>

          {/* ============ COLUMNA DERECHA: HISTORIAL ============ */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 h-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <History className="h-5 w-5 mr-2 text-indigo-500" />
                Historial de Contratos
              </h3>
              
              {fetchingHistorial ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
              ) : historial.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo/Inicio-Fin</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historial.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            <div className="font-medium text-gray-900 break-words" style={{ maxWidth: '250px' }} title={c.tipo_contrato}>
                              {c.tipo_contrato}
                            </div>
                            <div className="text-gray-600 mt-1">
                              <span className="font-medium">Inicio:</span> {formatearFecha(c.fecha_inicio)}
                              {c.fecha_fin ? (
                                <> <span className="font-medium ml-2">Fin:</span> {formatearFecha(c.fecha_fin)}</>
                              ) : (
                                <span className="ml-2 italic">(Indefinido)</span>
                              )}
                            </div>
                            {c.contrato_template && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 mt-1">
                                <Code className="h-3 w-3 mr-0.5" />
                                Plantilla personalizada
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex flex-col space-y-1 items-end">
                              <div className="flex space-x-2">
                                <button type="button" onClick={() => handleReprint(c)}
                                  className="text-indigo-600 hover:text-indigo-900 inline-flex items-center" title="Reimprimir">
                                  <Printer className="h-4 w-4 mr-1" /> Imprimir
                                </button>
                                <button type="button" onClick={() => handleRenew(c)}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center" title="Renovar (carga datos y plantilla)">
                                  <RefreshCw className="h-4 w-4 mr-1" /> Renovar
                                </button>
                              </div>
                              <button type="button" onClick={() => handleDelete(c.id)}
                                className="text-red-600 hover:text-red-900 inline-flex items-center" title="Eliminar">
                                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 italic">
                  <FileText className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">
                    {selectedEmpleadoId 
                      ? "No hay contratos registrados para este empleado." 
                      : "Seleccione un empleado para ver su historial."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ EDITOR DE PLANTILLA (Full Width debajo) ============ */}
        <div className="mt-8">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            {/* Header del editor */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Code className="h-5 w-5 mr-2 text-indigo-500" />
                3. Plantilla del Contrato
                {templateModificada && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Modificada
                  </span>
                )}
                {origenPlantilla === 'empresa' && !templateModificada && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <Star className="h-3 w-3 mr-0.5" /> Default de empresa
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <button type="button" onClick={() => setShowGestorPlantillas(!showGestorPlantillas)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors">
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  Mis Plantillas ({plantillasGuardadas.length})
                </button>
                <button type="button" onClick={() => { setShowGuardarModal(true); setNombreNuevaPlantilla(''); setGuardarComoDefault(false); }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                  disabled={!templateText.trim()}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Guardar Plantilla
                </button>
                <button type="button" onClick={restaurarPlantillaDefault}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Restaurar plantilla por defecto">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Restaurar Default
                </button>
                <button type="button" onClick={() => setShowEditor(!showEditor)}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    showEditor 
                      ? 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200' 
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}>
                  {showEditor ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showEditor ? 'Ocultar Editor' : 'Mostrar Editor'}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Usa <code className="bg-gray-200 px-1 rounded">{'**negrilla**'}</code>, <code className="bg-gray-200 px-1 rounded">{'_cursiva_'}</code>, <code className="bg-gray-200 px-1 rounded">{'__subrayado__'}</code> y <code className="bg-gray-200 px-1 rounded">{'- viñetas'}</code>. Las variables <code className="bg-gray-200 px-1 rounded">{'{{VARIABLE}}'}</code> se reemplazan automáticamente.
            </p>

            {/* ============ MODAL GUARDAR PLANTILLA ============ */}
            {showGuardarModal && (
              <div className="mb-4 p-4 bg-white rounded-lg border-2 border-green-300 shadow-md">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Save className="h-4 w-4 mr-1 text-green-600" />
                  Guardar plantilla actual
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la plantilla</label>
                    <input
                      type="text"
                      value={nombreNuevaPlantilla}
                      onChange={(e) => setNombreNuevaPlantilla(e.target.value)}
                      placeholder="Ej: Contrato término fijo 2024"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      maxLength={100}
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="guardarComoDefault"
                      checked={guardarComoDefault}
                      onChange={(e) => setGuardarComoDefault(e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="guardarComoDefault" className="ml-2 text-xs text-gray-600">
                      Establecer como plantilla predeterminada de la empresa
                    </label>
                  </div>
                  <div className="flex space-x-2">
                    <button type="button" onClick={handleGuardarPlantilla} disabled={savingPlantilla || !nombreNuevaPlantilla.trim()}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 transition-colors">
                      {savingPlantilla ? (
                        <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div> Guardando...</>
                      ) : (
                        <><Check className="h-3.5 w-3.5 mr-1" /> Guardar</>
                      )}
                    </button>
                    <button type="button" onClick={() => setShowGuardarModal(false)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">
                      <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============ GESTOR DE PLANTILLAS GUARDADAS ============ */}
            {showGestorPlantillas && (
              <div className="mb-4 p-4 bg-white rounded-lg border-2 border-indigo-200 shadow-md">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <FolderOpen className="h-4 w-4 mr-1 text-indigo-600" />
                  Plantillas guardadas de tu empresa
                </h4>
                {loadingPlantillas ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                  </div>
                ) : plantillasGuardadas.length > 0 ? (
                  <div className="space-y-2">
                    {plantillasGuardadas.map((p) => (
                      <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-md border text-sm ${
                        p.es_default ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex-1 min-w-0 mr-3">
                          {editandoPlantillaId === p.id ? (
                            <div className="flex items-center space-x-1">
                              <input type="text" value={editandoNombre} onChange={(e) => setEditandoNombre(e.target.value)}
                                className="flex-1 text-xs border-gray-300 rounded px-2 py-1" maxLength={100}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenombrarPlantilla(p.id); if (e.key === 'Escape') setEditandoPlantillaId(null); }}
                                autoFocus />
                              <button type="button" onClick={() => handleRenombrarPlantilla(p.id)}
                                className="text-green-600 hover:text-green-800"><Check className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => setEditandoPlantillaId(null)}
                                className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800 truncate">{p.nombre}</span>
                              {p.es_default && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-200 text-green-800">
                                  <Star className="h-2.5 w-2.5 mr-0.5" /> Default
                                </span>
                              )}
                              <span className="ml-2 text-[10px] text-gray-400">
                                {new Date(p.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button type="button" onClick={() => cargarPlantillaGuardada(p)}
                            className="text-indigo-600 hover:text-indigo-800 p-1" title="Cargar en editor">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleActualizarPlantilla(p.id)}
                            className="text-blue-600 hover:text-blue-800 p-1" title="Actualizar con contenido actual del editor"
                            disabled={savingPlantilla}>
                            <Save className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => { setEditandoPlantillaId(p.id); setEditandoNombre(p.nombre); }}
                            className="text-gray-500 hover:text-gray-700 p-1" title="Renombrar">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {!p.es_default && (
                            <button type="button" onClick={() => handleSetDefault(p.id)}
                              className="text-yellow-600 hover:text-yellow-800 p-1" title="Establecer como predeterminada">
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button type="button" onClick={() => handleEliminarPlantilla(p.id, p.nombre)}
                            className="text-red-500 hover:text-red-700 p-1" title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-400 italic">
                    <FolderOpen className="h-8 w-8 mx-auto mb-1 opacity-30" />
                    No hay plantillas guardadas. Usa &quot;Guardar Plantilla&quot; para crear la primera.
                  </div>
                )}
              </div>
            )}

            {/* ============ EDITOR ============ */}
            {showEditor && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Panel de Variables */}
                <div className="lg:col-span-1">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Variables Disponibles
                    <span className="ml-1 text-xs text-gray-400">(clic para insertar)</span>
                  </h4>
                  <VariablesPanel 
                    variables={variablesDisponibles}
                    onInsertVariable={insertarVariable}
                  />
                </div>

                {/* Editor de texto */}
                <div className="lg:col-span-3">
                  {loadingPlantilla ? (
                    <div className="flex items-center justify-center h-64 bg-white rounded border border-gray-200">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <span className="ml-2 text-gray-500 text-sm">Cargando plantilla...</span>
                    </div>
                  ) : (
                    <>
                      {/* Toolbar de formato */}
                      <div className="flex items-center space-x-1 mb-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                        <span className="text-[10px] text-gray-500 mr-1.5 font-medium select-none">Formato:</span>
                        <button type="button" onClick={() => wrapSelectedText('**', '**')}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900" title="Negrilla (**texto**)">
                          <Bold className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => wrapSelectedText('_', '_')}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900" title="Cursiva (_texto_)">
                          <Italic className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => wrapSelectedText('__', '__')}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900" title="Subrayado (__texto__)">
                          <Underline className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                        <button type="button" onClick={insertBulletAtLine}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900" title="Viñeta (- texto)">
                          <List className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                        <span className="text-[10px] text-gray-400 italic select-none">Selecciona texto y aplica formato</span>
                      </div>
                      <textarea
                        ref={editorRef}
                        value={templateText}
                        onChange={(e) => setTemplateText(e.target.value)}
                        className="w-full h-96 font-mono text-sm border border-gray-300 rounded-md p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y bg-white leading-relaxed"
                        placeholder="Escribe o pega el contenido de tu contrato aquí..."
                        spellCheck={false}
                      />
                      {/* Barra de estado */}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <div className="flex items-center space-x-3">
                          <span>{charCount.toLocaleString()} / {MAX_TEMPLATE_LENGTH.toLocaleString()} caracteres</span>
                          {charPercent > 80 && (
                            <span className={`font-medium ${charPercent > 95 ? 'text-red-500' : 'text-yellow-500'}`}>
                              ({charPercent}%)
                            </span>
                          )}
                        </div>
                        <span>
                          {templateModificada ? 'Plantilla personalizada' : (origenPlantilla === 'empresa' ? 'Plantilla default de empresa' : 'Plantilla por defecto (archivo)')}
                        </span>
                      </div>
                      {/* Aviso de seguridad legal */}
                      <div className="flex items-start space-x-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                        <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-700">
                          Por seguridad legal, el sistema solo permite estilos que no alteran el contenido contractual.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {!showEditor && (
              <div className="bg-white rounded border border-dashed border-gray-300 p-4 text-center text-gray-400 text-sm">
                <Code className="h-6 w-6 mx-auto mb-1 opacity-30" />
                <p>
                  {templateModificada 
                    ? 'Plantilla personalizada cargada. Haz clic en "Mostrar Editor" para verla o editarla.'
                    : origenPlantilla === 'empresa'
                      ? 'Usando plantilla predeterminada de la empresa. Haz clic en "Mostrar Editor" para personalizarla.'
                      : 'Usando plantilla por defecto. Haz clic en "Mostrar Editor" para personalizarla.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón Generar */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={generating || !selectedEmpleadoId}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
              generating || !selectedEmpleadoId ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando Contrato...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Generar Contrato PDF
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneradorContratos;
