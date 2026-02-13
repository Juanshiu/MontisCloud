'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Usuario, Rol } from '../../types';
import { User, Plus, Edit, Trash2, X, Check, Search, Shield, AlertTriangle } from 'lucide-react';
import { apiService } from '../../services/api';

interface LimitesLicencia {
  max_usuarios: number;
  max_mesas: number;
  plan: string;
  estado: string;
  usuarios_actuales: number;
  mesas_actuales: number;
  puede_crear_usuarios: boolean;
  puede_crear_mesas: boolean;
}

export default function GestionUsuarios() {
  const { usuario: usuarioSesion, tienePermiso } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [limitesLicencia, setLimitesLicencia] = useState<LimitesLicencia | null>(null);
  
  // Estado para el modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol_id: '',
    pin: '',
    telefono: '',
    activo: true
  });

  const API_URL = '/api';

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Cargar usuarios
      const resUsuarios = await fetch(`${API_URL}/usuarios`, { headers });
      if (!resUsuarios.ok) throw new Error('Error al cargar usuarios');
      const dataUsuarios = await resUsuarios.json();
      setUsuarios(dataUsuarios);

      // Cargar roles
      const resRoles = await fetch(`${API_URL}/roles`, { headers });
      if (!resRoles.ok) throw new Error('Error al cargar roles');
      const dataRoles = await resRoles.json();
      setRoles(dataRoles);

      // Cargar límites de licencia
      try {
        const limites = await apiService.getLimitesLicencia();
        setLimitesLicencia(limites);
      } catch (e) {
        console.warn('No se pudieron cargar los límites de licencia');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleOpenModal = (usuario?: Usuario) => {
    if (usuario) {
      setUsuarioEditar(usuario);
      setFormData({
        email: (usuario as any).email || '',
        password: '', // No mostrar password
        nombre_completo: usuario.nombre_completo || '',
        rol_id: usuario.rol_id || '',
        pin: usuario.pin || '',
        telefono: usuario.telefono || '',
        activo: usuario.activo
      });
    } else {
      setUsuarioEditar(null);
      setFormData({
        email: '',
        password: '',
        nombre_completo: '',
        rol_id: roles.length > 0 ? roles[0].id : '',
        pin: '',
        telefono: '',
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

      if (usuarioEditar) {
        // Actualizar usuario
        const data: any = { ...formData };
        if (!data.password) delete data.password; // Solo enviar si se cambia

        const res = await fetch(`${API_URL}/usuarios/${usuarioEditar.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Error al actualizar usuario');
      } else {
        // Crear usuario
        const res = await fetch(`${API_URL}/usuarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error al crear usuario');
      }

      setModalAbierto(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const nombreCompleto = u.nombre_completo || '';
    const email = (u as any).email || '';
    const filtroLower = filtro.toLowerCase();
    return nombreCompleto.toLowerCase().includes(filtroLower) ||
           email.toLowerCase().includes(filtroLower);
  });

  if (cargando) return <div className="p-8 text-center">Cargando usuarios...</div>;

  const puedeCrearUsuarios = limitesLicencia?.puede_crear_usuarios !== false;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-800">Gestión de Usuarios</h2>
        <div className="flex items-center gap-4">
          {limitesLicencia && (
            <div className="text-sm text-secondary-600">
              <span className={`font-medium ${!puedeCrearUsuarios ? 'text-red-600' : ''}`}>
                {limitesLicencia.usuarios_actuales}/{limitesLicencia.max_usuarios}
              </span>
              <span className="ml-1">usuarios</span>
              <span className="ml-2 text-xs text-secondary-400">
                (Plan {limitesLicencia.plan})
              </span>
            </div>
          )}
          <button
            onClick={() => handleOpenModal()}
            disabled={!puedeCrearUsuarios}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
              puedeCrearUsuarios
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!puedeCrearUsuarios ? 'Has alcanzado el límite de usuarios de tu plan' : ''}
          >
            <Plus size={20} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Alerta de límite alcanzado */}
      {limitesLicencia && !puedeCrearUsuarios && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Límite de usuarios alcanzado</p>
            <p className="text-sm">
              Tu plan {limitesLicencia.plan} permite hasta {limitesLicencia.max_usuarios} usuarios. 
              Para agregar más usuarios, contacta al administrador para actualizar tu plan.
            </p>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-secondary-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar usuarios..."
          className="pl-10 w-full md:w-1/3 border border-secondary-300 rounded-lg p-2"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">PIN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {usuariosFiltrados.map((u) => (
              <tr key={u.id} className="hover:bg-secondary-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-secondary-900">{u.nombre_completo}</div>
                      <div className="text-sm text-primary-500">{(u as any).email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {u.rol_nombre}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                  {u.pin ? '••••' : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(u)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <Edit size={18} />
                  </button>
                  {u.id !== usuarioSesion?.id && (
                    <button
                      onClick={() => handleDesactivar(u.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-secondary-900">
                {usuarioEditar ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button 
                onClick={() => setModalAbierto(false)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700">Email</label>
                <input
                  type="email"
                  required
                  placeholder="empleado@empresa.com"
                  className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <p className="mt-1 text-xs text-secondary-500">Este será el email para iniciar sesión</p>
              </div>

              {!usuarioEditar && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}

              {usuarioEditar && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700">
                    Nueva Contraseña (opcional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Dejar vacía para mantener actual"
                    className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-secondary-700">Rol</label>
                <select
                  className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                  value={formData.rol_id}
                  onChange={(e) => setFormData({...formData, rol_id: e.target.value})}
                >
                  <option value={0}>Seleccionar rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700">PIN (Caja)</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700">Teléfono</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-secondary-300 rounded-md shadow-sm p-2"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="activo"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-secondary-900">
                  Usuario Activo
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
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
                  {usuarioEditar ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
