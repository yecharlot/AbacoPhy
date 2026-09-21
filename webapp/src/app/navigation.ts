/**
 * Minimal “active screen” state (no router library yet).
 */

export type ScreenId = string;

let current: ScreenId = 'home';
const listeners = new Set<(id: ScreenId) => void>();

export function getScreen(): ScreenId {
  return current;
}

export function setScreen(id: ScreenId): void {
  if (id === current) return;
  current = id;
  listeners.forEach((fn) => fn(current));
}

export function subscribeScreen(fn: (id: ScreenId) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function screenTitle(id: ScreenId): string {
  const map: Record<string, string> = {
    dashboard: 'Tablero de Control',
    ingresos: 'Registro de Ingresos',
    gastos: 'Registro de Gastos',
    facturas: 'Gestión de Facturas',
    empleados: 'Gestión de Empleados',
    liquidaciones: 'Liquidación de Nómina',
    catalog: 'Catálogo / Nomencladores',
    cuentas: 'Plan de Cuentas',
    reportes: 'Reportes y Balances',
    tenant: 'Configuración del Negocio',
    home: 'Inicio',
  };
  return map[id] ?? id;
}
