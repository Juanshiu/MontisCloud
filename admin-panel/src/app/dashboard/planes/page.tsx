'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, CreditCard, Users, LayoutGrid, 
  Calendar, Edit, Save, X, Check, Settings
} from 'lucide-react';

interface PlanConfig {
  id: string;
  nombre: string;
  descripcion: string;
  precio_anual: number;
  max_usuarios: number;
  max_mesas: number;
  duracion_dias: number;
  features: Record<string, boolean>;
  activo: boolean;
}

export default function ConfiguracionPlanesPage() {
  const router = useRouter();
  const [planes, setPlanes] = useState<Record<string, PlanConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PlanConfig>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchPlanes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/planes', { headers: getAuthHeaders() });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al cargar planes');
      const data = await res.json();
      setPlanes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchPlanes();
  }, [router, fetchPlanes]);

  const handleEditar = (planId: string) => {
    setEditando(planId);
    setFormData({ ...planes[planId] });
    setError('');
    setSuccess('');
  };

  const handleCancelar = () => {
    setEditando(null);
    setFormData({});
  };

  const handleGuardar = async () => {
    if (!editando) return;
    
    setSaving(editando);
    setError('');
    
    try {
      const res = await fetch(`/api/admin/planes/${editando}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          precio_anual: formData.precio_anual,
          max_usuarios: formData.max_usuarios,
          max_mesas: formData.max_mesas,
          duracion_dias: formData.duracion_dias,
          descripcion: formData.descripcion,
          activo: formData.activo
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setSuccess(`Plan ${planes[editando].nombre} actualizado correctamente`);
      setEditando(null);
      fetchPlanes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const formatPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(valor);
  };

  const featureLabels: Record<string, string> = {
    comandas: 'Comandas',
    mesas: 'Gestión de Mesas',
    facturacion_simple: 'Facturación Simple',
    facturacion_electronica: 'Facturación Electrónica',
    reportes_basicos: 'Reportes Básicos',
    reportes_avanzados: 'Reportes Avanzados',
    inventario: 'Inventario',
    inventario_avanzado: 'Inventario Avanzado',
    nomina: 'Nómina',
    multi_sucursal: 'Multi-sucursal',
    api_acceso: 'Acceso API',
    control_acceso: 'Control de Acceso / Cierre de Servicio'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Cargando configuración de planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-500" />
                <h1 className="text-xl font-bold text-white">Configuración de Planes</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Información */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-400">
            <strong className="text-white">💡 Nota:</strong> Los cambios en la configuración de planes 
            afectan a nuevas licencias. Las licencias existentes mantienen su configuración original 
            hasta su renovación.
          </p>
        </div>

        {/* Grid de planes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Object.values(planes).map((plan) => (
            <div 
              key={plan.id}
              className={`bg-slate-800 rounded-xl border ${
                editando === plan.id ? 'border-purple-500' : 'border-slate-700'
              } overflow-hidden`}
            >
              {/* Header del plan */}
              <div className={`p-6 border-b border-slate-700 ${
                plan.id === 'basico' ? 'bg-gradient-to-r from-slate-700/50 to-slate-800' :
                plan.id === 'profesional' ? 'bg-gradient-to-r from-blue-900/30 to-slate-800' :
                'bg-gradient-to-r from-purple-900/30 to-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
                    {editando === plan.id ? (
                      <input
                        type="text"
                        value={formData.descripcion || ''}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="mt-1 w-full text-sm bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300"
                      />
                    ) : (
                      <p className="text-sm text-slate-400 mt-1">{plan.descripcion}</p>
                    )}
                  </div>
                  {editando !== plan.id && (
                    <button
                      onClick={() => handleEditar(plan.id)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-4">
                {/* Precio */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">Precio Anual</p>
                    {editando === plan.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          value={formData.precio_anual || 0}
                          onChange={(e) => setFormData({ ...formData, precio_anual: parseInt(e.target.value) })}
                          className="w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                        />
                        <span className="text-slate-400">COP</span>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-white">{formatPrecio(plan.precio_anual)}</p>
                    )}
                  </div>
                </div>

                {/* Usuarios */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">Máx. Usuarios</p>
                    {editando === plan.id ? (
                      <input
                        type="number"
                        value={formData.max_usuarios || 0}
                        onChange={(e) => setFormData({ ...formData, max_usuarios: parseInt(e.target.value) })}
                        className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-white">{plan.max_usuarios}</p>
                    )}
                  </div>
                </div>

                {/* Mesas */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <LayoutGrid className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">Máx. Mesas</p>
                    {editando === plan.id ? (
                      <input
                        type="number"
                        value={formData.max_mesas || 0}
                        onChange={(e) => setFormData({ ...formData, max_mesas: parseInt(e.target.value) })}
                        className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-white">{plan.max_mesas}</p>
                    )}
                  </div>
                </div>

                {/* Duración */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">Duración</p>
                    {editando === plan.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.duracion_dias || 365}
                          onChange={(e) => setFormData({ ...formData, duracion_dias: parseInt(e.target.value) })}
                          className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                        />
                        <span className="text-slate-400">días</span>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-white">{plan.duracion_dias} días</p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm font-medium text-slate-300 mb-2">Funcionalidades incluidas:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(plan.features)
                      .filter(([, enabled]) => enabled)
                      .map(([feature]) => (
                        <span 
                          key={feature}
                          className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                        >
                          {featureLabels[feature] || feature}
                        </span>
                      ))
                    }
                  </div>
                </div>

                {/* Estado */}
                {editando === plan.id && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id={`activo-${plan.id}`}
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor={`activo-${plan.id}`} className="text-sm text-slate-300">
                      Plan activo (disponible para nuevas licencias)
                    </label>
                  </div>
                )}
              </div>

              {/* Footer de edición */}
              {editando === plan.id && (
                <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex gap-2">
                  <button
                    onClick={handleCancelar}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={saving === plan.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-700 
                             disabled:bg-purple-800 text-white rounded-lg"
                  >
                    <Save className="w-4 h-4" />
                    {saving === plan.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info adicional */}
        <div className="mt-8 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Cómo funciona el prorrateo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-2xl mb-2">1️⃣</div>
              <h4 className="font-medium text-white mb-1">Valor diario</h4>
              <p className="text-slate-400">Precio anual ÷ 365 días</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-2xl mb-2">2️⃣</div>
              <h4 className="font-medium text-white mb-1">Crédito</h4>
              <p className="text-slate-400">Valor diario × días restantes</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-2xl mb-2">3️⃣</div>
              <h4 className="font-medium text-white mb-1">Nuevo pago</h4>
              <p className="text-slate-400">Precio nuevo plan - Crédito</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
