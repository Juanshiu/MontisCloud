export interface RequestContext {
  userId: string;
  empresaId: string;
  nombre: string;
  email: string;
  rol: {
    id: string; // UUID role id
    nombre: string;
    es_superusuario?: boolean;
  };
  permisos: string[];
  // Campos de impersonación (Modo Soporte)
  impersonated?: boolean;
  originalAdminId?: string;
  originalAdminEmail?: string;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
      printContext?: {
        printerId: string;
        empresaId: string;
      };
    }
  }
}
