'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UsuarioSesion, LoginRequest, LoginResponse } from '../types';

interface AuthContextType {
  usuario: UsuarioSesion | null;
  permisos: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credenciales: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  tienePermiso: (permiso: string) => boolean;
  verificarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = usuario !== null;

  // Función para obtener el token del localStorage
  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Función para guardar el token en localStorage
  const saveToken = (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  };

  // Función para eliminar el token
  const removeToken = (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  };

  // Verificar sesión válida al cargar la app
  const verificarSesion = async () => {
    setIsLoading(true);
    const token = getToken();
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Decodificar el token para verificar si es de impersonación
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        
        // Si es un token de impersonación, cargar datos directamente del token
        if (payload.impersonated === true) {
          setUsuario({
            id: payload.userId,
            nombre_completo: payload.nombre,
            usuario: payload.email.split('@')[0], // Generar usuario desde el email
            email: payload.email,
            rol_nombre: payload.rol,
            empresa_id: payload.empresaId,
            es_superusuario: false
          });
          setPermisos(payload.permisos || []);
          setIsLoading(false);
          return;
        }
      }

      // Si no es token de impersonación, validar normalmente con el servidor
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: { usuario: UsuarioSesion; permisos: string[] } = await response.json();
        setUsuario(data.usuario);
        setPermisos(data.permisos);
      } else {
        // Token inválido o sesión expirada
        removeToken();
        setUsuario(null);
        setPermisos([]);
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
      removeToken();
      setUsuario(null);
      setPermisos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (credenciales: LoginRequest) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credenciales)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Crear error con código para errores de licencia
        const error = new Error(errorData.error || 'Error al iniciar sesión');
        if (errorData.codigo) {
          (error as any).codigo = errorData.codigo;
        }
        throw error;
      }

      const data: LoginResponse = await response.json();
      
      // Guardar token
      saveToken(data.token);
      
      // Actualizar estado
      setUsuario(data.usuario);
      setPermisos(data.permisos);
    } catch (error: any) {
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    const token = getToken();
    
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }

    // Limpiar estado
    removeToken();
    setUsuario(null);
    setPermisos([]);
  };

  // Verificar si el usuario tiene un permiso específico
  const tienePermiso = (permiso: string): boolean => {
    // Los superusuarios tienen todos los permisos
    if (usuario?.es_superusuario) {
      return true;
    }
    
    return Array.isArray(permisos) && permisos.includes(permiso);
  };

  // Verificar sesión al montar el componente
  useEffect(() => {
    verificarSesion();
  }, []);

  // Escuchar evento de sesión expirada (disparado por interceptor api.ts)
  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      console.warn('[AUTH] Sesión expirada:', event.detail?.message);
      removeToken();
      setUsuario(null);
      setPermisos([]);
    };

    window.addEventListener('session-expired', handleSessionExpired as EventListener);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired as EventListener);
    };
  }, []);

  const value: AuthContextType = {
    usuario,
    permisos,
    isAuthenticated,
    isLoading,
    login,
    logout,
    tienePermiso,
    verificarSesion
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
