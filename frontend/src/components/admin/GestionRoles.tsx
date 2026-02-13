'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Rol } from '../../types';
import { Shield, Plus, Edit, Trash2, X, Users, CheckSquare, Square } from 'lucide-react';

const PERMISOS_DISPONIBLES = [
  { id: 'crear_comandas', nombre: 'Crear y Editar Comandas', descripcion: 'Permite tomar pedidos y modificar comandas activas' },
  { id: 'gestionar_caja', nombre: 'Manejar Caja', descripcion: 'Acceso a la interfaz de facturación y cierre de caja' },
  { id: 'ver_reportes', nombre: 'Ver Reportes', descripcion: 'Visualizar estadísticas de ventas y reportes financieros' },
  { id: 'ver_historial', nombre: 'Ver Historial', descripcion: 'Acceso al historial completo de comandas pasadas' },
  { id: 'gestion_menu', nombre: 'Gestión de Menú', descripcion: 'Crear, editar y eliminar productos y categorías' },
  { id: 'gestion_espacios', nombre: 'Gestión de Espacios', descripcion: 'Administrar mesas y salones' },
  { id: 'nomina.gestion', nombre: 'Gestión de Nómina', descripcion: 'Administrar empleados, contratos y liquidaciones' },
];

export default function GestionRoles() {
  const { usuario: usuarioSesion } = useAuth();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para el modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rolEditar, setRolEditar] = useState<Rol | null>(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    es_superusuario: false,
    permisos: [] as string[],
    activo: true
  });

  const API_URL = '/api';

  useEffect(() => {
    cargarRoles();
  }, []);

  const cargarRoles = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar roles');
      const data = await res.json();
      setRoles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleOpenModal = async (rol?: Rol) => {
    if (rol) {
      // Cargar detalles completos del rol (incluyendo permisos)
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/roles/${rol.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar detalles del rol');
        const rolDetalle = await res.json();
        
        setRolEditar(rolDetalle);
        const esAdminPrincipal = rolDetalle.nombre === 'Administrador' || rolDetalle.nombre === 'SuperAdmin';
        setFormData({
          nombre: rolDetalle.nombre,
          descripcion: rolDetalle.descripcion || '',
          es_superusuario: esAdminPrincipal ? true : Boolean(rolDetalle.es_superusuario),
          permisos: rolDetalle.permisos?.map((p: any) => p.permiso) || [],
          activo: Boolean(rolDetalle.activo)
        });
      } catch (err: any) {
        setError(err.message);
        return;
      }
    } else {
      setRolEditar(null);
      setFormData({
        nombre: '',
        descripcion: '',
        es_superusuario: false,
        permisos: [],
        activo: true
      });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (rolEditar) {
        // Actualizar rol
        const res = await fetch(`${API_URL}/roles/${rolEditar.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error al actualizar rol');
      } else {
        // Crear rol
        const res = await fetch(`${API_URL}/roles`, {
          method: 'POST',
          headers,
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error al crear rol');
      }

      setModalAbierto(false);
      cargarRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar este rol?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al desactivar rol');
      }
      
      cargarRoles();
    } catch (err: any) {
      setError(err.message);
      // Limpiar error después de 3 segundos
      setTimeout(() => setError(''), 3000);
    }
  };

  const togglePermiso = (permisoId: string) => {
    setFormData(prev => {
      const permisos = prev.permisos.includes(permisoId)
        ? prev.permisos.filter(p => p !== permisoId)
        : [...prev.permisos, permisoId];
      return { ...prev, permisos };
    });
  };

  if (cargando) return <div className="p-8 text-center">Cargando roles...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-800">Gestión de Roles y Permisos</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={20} />
          <span>Nuevo Rol</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </span>
        </div>
      )}

      {/* Lista de Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((rol) => (
          <div key={rol.id} className={`bg-white rounded-lg shadow-md border-l-4 ${rol.activo ? 'border-primary-500' : 'border-secondary-300'} overflow-hidden`}>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <Shield className={`w-5 h-5 ${rol.es_superusuario ? 'text-primary-600' : 'text-secondary-500'}`} />
                  <h3 className="text-lg font-semibold text-secondary-900">{rol.nombre}</h3>
                </div>
                {!rol.activo && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Inactivo</span>
                )}
              </div>
              
              <p className="mt-2 text-sm text-secondary-600 h-10 line-clamp-2">
                {rol.descripcion || 'Sin descripción'}
              </p>

              <div className="mt-4 flex items-center text-sm text-secondary-500">
                <Users className="w-4 h-4 mr-1" />
                <span>{Number(rol.cantidad_usuarios) || 0} usuarios asignados</span>
              </div>

              <div className="mt-4 pt-4 border-t border-secondary-100 flex justify-end space-x-3">
                <button
                  onClick={() => handleOpenModal(rol)}
                  className="text-primary-600 hover:text-primary-800 flex items-center text-sm font-medium"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </button>
                {/* No permitir eliminar rol Super Usuario o roles con usuarios */}
                {!rol.es_superusuario && (Number(rol.cantidad_usuarios) === 0) && (
                  <button
                    onClick={() => handleDesactivar(rol.id)}
                    className="text-red-600 hover:text-red-800 flex items-center text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-secondary-900">
                {rolEditar ? 'Editar Rol' : 'Nuevo Rol'}
              </h3>
              <button 
                onClick={() => setModalAbierto(false)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700">Nombre del Rol</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej. Mesero, Cajero, Gerente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700">Descripción</label>
                  <textarea
                    className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                    rows={2}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Describe las responsabilidades de este rol..."
                  />
                </div>

                <div className="bg-secondary-50 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="es_superusuario"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded disabled:opacity-50"
                      checked={formData.es_superusuario}
                      disabled={rolEditar?.nombre === 'Administrador' || rolEditar?.nombre === 'SuperAdmin'}
                      onChange={(e) => setFormData({
                        ...formData, 
                        es_superusuario: e.target.checked,
                        // Si es superusuario, no necesita seleccionar permisos individuales (tiene todos)
                      })}
                    />
                    <label htmlFor="es_superusuario" className="ml-2 font-medium text-secondary-900">
                      Es Super Usuario
                    </label>
                  </div>
                  <p className="text-xs text-secondary-500 ml-6">
                    Los superusuarios tienen acceso total al sistema, incluyendo configuración y gestión de usuarios.
                  </p>
                </div>

                {!formData.es_superusuario && (
                  <div>
                    <h4 className="font-medium text-secondary-900 mb-3">Permisos del Sistema</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {PERMISOS_DISPONIBLES.map((permiso) => (
                        <div 
                          key={permiso.id} 
                          className={`
                            border rounded-lg p-3 cursor-pointer transition-colors
                            ${formData.permisos.includes(permiso.id) 
                              ? 'bg-primary-50 border-primary-200' 
                              : 'bg-white border-secondary-200 hover:bg-secondary-50'}
                          `}
                          onClick={() => togglePermiso(permiso.id)}
                        >
                          <div className="flex items-center">
                            <div className={`
                              flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center mr-3
                              ${formData.permisos.includes(permiso.id)
                                ? 'bg-primary-600 border-primary-600 text-white'
                                : 'border-secondary-300 text-transparent'}
                            `}>
                              <CheckSquare size={14} />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-secondary-900">{permiso.nombre}</p>
                              <p className="text-xs text-secondary-500 mt-0.5">{permiso.descripcion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  {rolEditar ? 'Guardar Cambios' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
