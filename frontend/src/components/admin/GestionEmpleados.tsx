import React, { useState, useEffect } from 'react';
import { Empleado } from '../../types';
import { apiService } from '../../services/api';
import { Plus, Edit2, UserCheck, UserX, Search, Filter, Trash2 } from 'lucide-react';

const GestionEmpleados: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del formulario
  const [formData, setFormData] = useState<Partial<Empleado>>({
    tipo_documento: 'CC',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    cargo: '',
    tipo_contrato: 'INDEFINIDO',
    fecha_inicio: '',
    salario_base: 0,
    tipo_trabajador: 'DEPENDIENTE',
    frecuencia_pago: 'MENSUAL',
    auxilio_transporte: true,
    estado: 'ACTIVO',
    salario_integral: false,
    alto_riesgo: false,
    metodo_pago: 'EFECTIVO',
    email: '',
    municipio: '',
    fecha_fin: '',
    es_periodo_prueba: false,
    fecha_fin_periodo_prueba: ''
  });

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEmpleados();
      setEmpleados(data);
    } catch (error) {
      console.error('Error al cargar empleados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const handleEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado);
    setFormData({
      ...empleado,
      // Asegurarse de formatear fechas para input type="date"
      fecha_inicio: typeof empleado.fecha_inicio === 'string' ? empleado.fecha_inicio.split('T')[0] : '',
      fecha_fin: empleado.fecha_fin && typeof empleado.fecha_fin === 'string' ? empleado.fecha_fin.split('T')[0] : '',
      fecha_fin_periodo_prueba: empleado.fecha_fin_periodo_prueba && typeof empleado.fecha_fin_periodo_prueba === 'string' ? empleado.fecha_fin_periodo_prueba.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingEmpleado(null);
    setFormData({
      tipo_documento: 'CC',
      numero_documento: '',
      nombres: '',
      apellidos: '',
      cargo: '',
      tipo_contrato: 'INDEFINIDO',
      fecha_inicio: new Date().toISOString().split('T')[0],
      salario_base: 0,
      tipo_trabajador: 'DEPENDIENTE',
      frecuencia_pago: 'MENSUAL',
      auxilio_transporte: true,
      estado: 'ACTIVO',
      salario_integral: false,
      alto_riesgo: false,
      metodo_pago: 'EFECTIVO',
      email: '',
      municipio: '',
      fecha_fin: '',
      es_periodo_prueba: false,
      fecha_fin_periodo_prueba: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tipo_contrato === 'TERMINO_FIJO' && !formData.fecha_fin) {
        alert('La fecha de fin de contrato es obligatoria para contratos a término fijo.');
        return;
    }
    if (formData.es_periodo_prueba) {
        if (!formData.fecha_fin_periodo_prueba) {
            alert('La fecha de fin de periodo de prueba es obligatoria.');
            return;
        }
        // Validar máximo 60 días
        const inicio = new Date(formData.fecha_inicio as string);
        const finPrueba = new Date(formData.fecha_fin_periodo_prueba as string);
        const diff = Math.ceil((finPrueba.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 60) {
            alert('El periodo de prueba no puede exceder los 60 días legales.');
            return;
        }
    }

    try {
      if (editingEmpleado) {
        await apiService.updateEmpleado(editingEmpleado.id, formData);
      } else {
        await apiService.createEmpleado(formData);
      }
      setShowModal(false);
      cargarEmpleados();
    } catch (error) {
      console.error('Error al guardar empleado:', error);
      alert('Error al guardar empleado. Verifique los datos.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este empleado? Esta acción no se puede deshacer.')) return;
    try {
        await apiService.deleteEmpleado(id);
        cargarEmpleados();
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        alert('Error al eliminar empleado.');
    }
  };

  const filteredEmpleados = empleados.filter(e => 
    e.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.numero_documento.includes(searchTerm) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Empleados</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nuevo Empleado
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado / Contacto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo / Contrato</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario Base</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center">Cargando...</td></tr>
                ) : filteredEmpleados.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center">No se encontraron empleados</td></tr>
                ) : (
                    filteredEmpleados.map((empleado) => (
                        <tr key={empleado.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{empleado.nombres} {empleado.apellidos}</div>
                                <div className="text-sm text-gray-500">{empleado.tipo_documento} {empleado.numero_documento}</div>
                                {empleado.email && <div className="text-xs text-blue-500">{empleado.email}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{empleado.cargo}</div>
                                <div className="text-xs text-gray-500">{empleado.tipo_contrato}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${empleado.salario_base.toLocaleString('es-CO')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    empleado.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {empleado.estado}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => handleEdit(empleado)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(empleado.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Datos Personales */}
                    <div className="md:col-span-2 bg-gray-50 p-3 rounded-md mb-2">
                        <h4 className="font-semibold mb-2 text-sm text-gray-700">Datos Personales</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombres</label>
                                <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Apellidos</label>
                                <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nro Documento</label>
                                <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.numero_documento} onChange={e => setFormData({...formData, numero_documento: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Celular</label>
                                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.celular || ''} onChange={e => setFormData({...formData, celular: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.direccion || ''} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Municipio</label>
                                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.municipio || ''} onChange={e => setFormData({...formData, municipio: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Datos Contractuales */}
                    <div className="md:col-span-2 bg-blue-50 p-3 rounded-md mb-2">
                        <h4 className="font-semibold mb-2 text-sm text-blue-800">Información Laboral</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cargo</label>
                                <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo Contrato</label>
                                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.tipo_contrato} onChange={e => setFormData({...formData, tipo_contrato: e.target.value as any})}>
                                    <option value="INDEFINIDO">Término Indefinido</option>
                                    <option value="TERMINO_FIJO">Término Fijo</option>
                                    <option value="OBRA_LABOR">Obra o Labor</option>
                                    <option value="APRENDIZAJE">Aprendizaje</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Salario Base</label>
                                <input type="number" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.salario_base} onChange={e => setFormData({...formData, salario_base: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                                <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                    value={formData.fecha_inicio as string} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
                            </div>
                            {formData.tipo_contrato === 'TERMINO_FIJO' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha Fin Contrato</label>
                                    <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" 
                                        value={formData.fecha_fin as string} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} />
                                </div>
                            )}
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Estado</label>
                                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value as any})}>
                                    <option value="ACTIVO">Activo</option>
                                    <option value="INACTIVO">Inactivo</option>
                                    <option value="VACACIONES">Vacaciones</option>
                                    <option value="LICENCIA">Licencia</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center">
                                    <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                                        checked={formData.es_periodo_prueba} onChange={e => setFormData({...formData, es_periodo_prueba: e.target.checked})} />
                                    <label className="ml-2 block text-sm text-gray-900 font-bold">En Período de Prueba</label>
                                </div>
                                {formData.es_periodo_prueba && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-blue-600 uppercase">Fin Prueba (Max 60 días)</label>
                                        <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1 text-sm border" 
                                            value={formData.fecha_fin_periodo_prueba as string} onChange={e => setFormData({...formData, fecha_fin_periodo_prueba: e.target.value})} />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center mt-6">
                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                                    checked={formData.auxilio_transporte} onChange={e => setFormData({...formData, auxilio_transporte: e.target.checked})} />
                                <label className="ml-2 block text-sm text-gray-900">Aplicar Aux. Transporte</label>
                            </div>
                             <div className="flex items-center mt-2">
                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                                    checked={formData.alto_riesgo} onChange={e => setFormData({...formData, alto_riesgo: e.target.checked})} />
                                <label className="ml-2 block text-sm text-gray-900">Alto Riesgo (ARL)</label>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                        <button type="button" onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            Cancelar
                        </button>
                        <button type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Guardar Empleado
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default GestionEmpleados;
