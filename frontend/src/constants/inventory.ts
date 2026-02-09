/**
 * Constantes para el sistema de inventario
 */

// Umbrales de alerta de inventario (en porcentaje)
export const INVENTORY_THRESHOLDS = {
  CRITICAL: 10,  // Menor a 10% es crítico
  LOW: 20,       // Entre 10-20% es bajo
  // Mayor a 20% es normal
} as const;

// Colores para indicadores de inventario
export const INVENTORY_COLORS = {
  NORMAL: {
    bg: 'bg-green-500',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800'
  },
  LOW: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  CRITICAL: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800'
  },
  DEPLETED: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800'
  }
} as const;

// Estados de inventario
export type InventoryStatus = 'NORMAL' | 'LOW' | 'CRITICAL' | 'DEPLETED';

/**
 * Calcula el estado del inventario basado en la cantidad actual e inicial
 */
export function getInventoryStatus(
  cantidadActual: number | null | undefined,
  cantidadInicial: number | null | undefined
): InventoryStatus {
  // Convertir a número para evitar problemas con strings de PostgreSQL ("0" vs 0)
  const actual = cantidadActual !== null && cantidadActual !== undefined ? Number(cantidadActual) : null;
  
  if (actual === null || actual <= 0) {
    return 'DEPLETED';
  }
  
  const inicial = cantidadInicial ? Number(cantidadInicial) : 0;
  if (!inicial || inicial === 0) {
    return 'NORMAL';
  }
  
  const porcentaje = (actual / inicial) * 100;
  
  if (porcentaje < INVENTORY_THRESHOLDS.CRITICAL) {
    return 'CRITICAL';
  } else if (porcentaje < INVENTORY_THRESHOLDS.LOW) {
    return 'LOW';
  }
  
  return 'NORMAL';
}

/**
 * Obtiene el mensaje de estado para mostrar al usuario
 */
export function getInventoryStatusMessage(status: InventoryStatus): string {
  const messages = {
    NORMAL: 'Normal',
    LOW: 'Bajo',
    CRITICAL: 'Crítico',
    DEPLETED: 'Agotado'
  };
  
  return messages[status];
}

/**
 * Calcula el porcentaje de inventario disponible
 */
export function getInventoryPercentage(
  cantidadActual: number | null | undefined,
  cantidadInicial: number | null | undefined
): number {
  if (!cantidadInicial || cantidadInicial === 0) {
    return 100;
  }
  
  if (cantidadActual === null || cantidadActual === undefined) {
    return 0;
  }
  
  return Math.min((cantidadActual / cantidadInicial) * 100, 100);
}
