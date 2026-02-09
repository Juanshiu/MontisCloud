'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Lock, Mail, Building2, AlertTriangle, Pause, Clock, XCircle, Phone, ShieldOff, Ban } from 'lucide-react';

// Tipos de bloqueo por licencia o acceso
type CodigoBloqueo = 'LICENCIA_PAUSADA' | 'LICENCIA_EXPIRADA' | 'SIN_LICENCIA' | 'SERVICIO_CERRADO' | 'FUERA_DE_HORARIO' | null;

interface ErrorBloqueo {
  codigo: CodigoBloqueo;
  mensaje: string;
}

export default function Login() {
  const { login, isLoading } = useAuth();
  const [empresaEmail, setEmpresaEmail] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorBloqueo, setErrorBloqueo] = useState<ErrorBloqueo | null>(null);
  const [procesando, setProcesando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorBloqueo(null);

    if (!empresaEmail || !usuarioEmail || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setProcesando(true);

    try {
      await login({ empresaEmail, usuarioEmail, password });
    } catch (err: any) {
      // Verificar si es un error de licencia o control de acceso
      const codigosBloqueo = ['LICENCIA_PAUSADA', 'LICENCIA_EXPIRADA', 'SIN_LICENCIA', 'SERVICIO_CERRADO', 'FUERA_DE_HORARIO'];
      
      if (err.codigo && codigosBloqueo.includes(err.codigo)) {
        setErrorBloqueo({
          codigo: err.codigo as CodigoBloqueo,
          mensaje: err.message || 'Error de acceso'
        });
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
      <div className="max-w-md w-full mx-4">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <LogIn className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sistema de Comandas
          </h1>
          <p className="text-primary-100 text-lg">
            Gestión Profesional
          </p>
        </div>

        {/* Formulario de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-secondary-800 mb-6 text-center">
            Iniciar Sesión
          </h2>

          {/* Cartel de bloqueo por licencia o control de acceso */}
          {errorBloqueo && (
            <BloqueoBanner 
              codigo={errorBloqueo.codigo} 
              mensaje={errorBloqueo.mensaje}
              onDismiss={() => setErrorBloqueo(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo de empresa (email del administrador) */}
            <div>
              <label htmlFor="empresaEmail" className="block text-sm font-medium text-secondary-700 mb-2">
                Empresa (correo del administrador)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="empresaEmail"
                  type="email"
                  value={empresaEmail}
                  onChange={(e) => setEmpresaEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="admin@miempresa.com"
                  disabled={procesando}
                  autoFocus
                />
              </div>
              <p className="mt-1 text-xs text-secondary-500">El correo del administrador de tu empresa</p>
            </div>

            {/* Campo de email del usuario (empleado) */}
            <div>
              <label htmlFor="usuarioEmail" className="block text-sm font-medium text-secondary-700 mb-2">
                Tu Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="usuarioEmail"
                  type="email"
                  value={usuarioEmail}
                  onChange={(e) => setUsuarioEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="tu@email.com"
                  disabled={procesando}
                />
              </div>
              <p className="mt-1 text-xs text-secondary-500">El email con el que te registraron como empleado</p>
            </div>

            {/* Campo de contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="••••••••"
                  disabled={procesando}
                />
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 text-center">{error}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={procesando || !empresaEmail || !usuarioEmail || !password}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {procesando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Información de ayuda */}
          <div className="mt-6 pt-6 border-t border-secondary-200">
            <p className="text-xs text-secondary-500 text-center">
              Si olvidaste tu contraseña, contacta al administrador de tu empresa
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-primary-100 text-sm">
            © 2026 Montis Cloud. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar el cartel de bloqueo por licencia o servicio cerrado
function BloqueoBanner({ 
  codigo, 
  mensaje,
  onDismiss 
}: { 
  codigo: CodigoBloqueo; 
  mensaje: string;
  onDismiss: () => void;
}) {
  // Configuración visual según el tipo de bloqueo
  const config = {
    LICENCIA_PAUSADA: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      textColor: 'text-blue-700',
      Icon: Pause,
      title: 'Servicio Pausado',
      description: 'El servicio de tu empresa ha sido pausado temporalmente por el administrador.',
      action: 'Contacta al administrador para más información sobre cuándo se reanudará el servicio.'
    },
    LICENCIA_EXPIRADA: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
      Icon: Clock,
      title: 'Licencia Expirada',
      description: 'La licencia de tu empresa ha expirado y necesita ser renovada para continuar usando el sistema.',
      action: 'Contacta al administrador para renovar la suscripción.'
    },
    SIN_LICENCIA: {
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-300',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      titleColor: 'text-slate-800',
      textColor: 'text-slate-700',
      Icon: XCircle,
      title: 'Sin Licencia Activa',
      description: 'Tu empresa no cuenta con una licencia activa para usar el sistema.',
      action: 'Contacta al administrador para activar una licencia.'
    },
    SERVICIO_CERRADO: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      titleColor: 'text-orange-800',
      textColor: 'text-orange-700',
      Icon: Ban,
      title: 'Servicio Cerrado',
      description: 'El servicio se encuentra cerrado por el administrador de tu empresa.',
      action: 'El administrador debe abrir el servicio para que puedas acceder.'
    },
    FUERA_DE_HORARIO: {
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-800',
      textColor: 'text-amber-700',
      Icon: Clock,
      title: 'Fuera de Horario',
      description: mensaje || 'No puedes acceder al sistema fuera del horario de operación.',
      action: 'Intenta nuevamente dentro del horario establecido por tu administrador.'
    }
  };

  const currentConfig = codigo ? config[codigo] : null;
  if (!currentConfig) return null;

  const { bgColor, borderColor, iconBg, iconColor, titleColor, textColor, Icon, title, description, action } = currentConfig;

  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-xl p-5 mb-6`}>
      <div className="flex items-start gap-4">
        <div className={`${iconBg} p-3 rounded-full`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h3>
          <p className={`text-sm ${textColor} mb-3`}>{description}</p>
          <div className={`flex items-center gap-2 text-sm ${textColor}`}>
            <Phone className="w-4 h-4" />
            <span>{action}</span>
          </div>
        </div>
      </div>
      <button onClick={onDismiss} className={`mt-4 w-full py-2 px-4 text-sm font-medium ${textColor} hover:underline`}>
        Volver a intentar con otra cuenta
      </button>
    </div>
  );
}
