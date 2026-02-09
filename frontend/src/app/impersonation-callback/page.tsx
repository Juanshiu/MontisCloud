'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ImpersonationCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Iniciando sesión de soporte...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No se proporcionó token de impersonación');
      return;
    }

    try {
      // Decodificar el token para validar que es de impersonación
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Token inválido');
      }

      const payload = JSON.parse(atob(parts[1]));

      if (!payload.impersonated) {
        throw new Error('Este no es un token de impersonación válido');
      }

      // Guardar el token en localStorage para el sistema de comandas
      localStorage.setItem('token', token);

      // Guardar datos de impersonación para mostrar el banner
      localStorage.setItem('impersonation_active', 'true');
      localStorage.setItem('impersonation_data', JSON.stringify({
        originalAdminId: payload.originalAdminId,
        originalAdminEmail: payload.originalAdminEmail,
        empresaId: payload.empresaId,
        userId: payload.userId,
        rol: payload.rol
      }));

      // Disparar evento personalizado para notificar al banner
      window.dispatchEvent(new CustomEvent('impersonationChanged', {
        detail: { active: true }
      }));

      setStatus('success');
      setMessage('Sesión de soporte iniciada correctamente');

      // Redirigir al sistema principal después de un breve delay
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (err: any) {
      console.error('Error procesando token de impersonación:', err);
      setStatus('error');
      setMessage(err.message || 'Error al procesar el token de impersonación');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Icon */}
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 ${
            status === 'loading' ? 'bg-blue-100' :
            status === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {status === 'loading' && (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {status === 'success' && (
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h1 className={`text-xl font-bold mb-2 ${
            status === 'loading' ? 'text-blue-900' :
            status === 'success' ? 'text-green-900' : 'text-red-900'
          }`}>
            {status === 'loading' && 'Modo Soporte'}
            {status === 'success' && '¡Sesión Iniciada!'}
            {status === 'error' && 'Error de Autenticación'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">{message}</p>

          {/* Info box for success */}
          {status === 'success' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-800">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  Verás un banner naranja mientras estés en modo soporte
                </span>
              </div>
            </div>
          )}

          {/* Error action */}
          {status === 'error' && (
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cerrar ventana
            </button>
          )}

          {/* Loading dots */}
          {status === 'loading' && (
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImpersonationCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ImpersonationCallbackContent />
    </Suspense>
  );
}
