/**
 * Active screen state (no router library).
 * Canonical summary screen id: `dashboard` (menu label «Resumen»).
 */

export type ScreenId = string;

const DEFAULT_SCREEN: ScreenId = 'dashboard';

/** Map aliases used historically or by mistake */
export function normalizeScreenId(id: ScreenId): ScreenId {
  if (!id || id === 'home' || id === 'resumen' || id === 'inicio') return 'dashboard';
  return id;
}

let current: ScreenId = DEFAULT_SCREEN;
const listeners = new Set<(id: ScreenId) => void>();

export function getScreen(): ScreenId {
  return current;
}

export function setScreen(id: ScreenId): void {
  const next = normalizeScreenId(id);
  if (next === current) return;
  current = next;
  listeners.forEach((fn) => fn(current));
}

/** Force set + notify even if same id (useful after login). */
export function forceScreen(id: ScreenId): void {
  current = normalizeScreenId(id);
  listeners.forEach((fn) => fn(current));
}

export function subscribeScreen(fn: (id: ScreenId) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function screenTitle(id: ScreenId): string {
  const key = normalizeScreenId(id);
  const map: Record<string, string> = {
    dashboard: 'Resumen',
    ingresos: 'Registro de Ingresos',
    gastos: 'Registro de Gastos',
    facturas: 'Gestión de Facturas',
    empleados: 'Gestión de Empleados',
    liquidaciones: 'Liquidación de Nómina',
    catalog: 'Catálogo / Nomencladores',
    cuentas: 'Plan de Cuentas',
    reportes: 'Reportes y Balances',
    tenant: 'Configuración del Negocio',
    almacen: 'Almacén Central',
    recepcion: 'Informes de Recepción',
    transferencias: 'Transferencias a Unidades',
    pos: 'Punto de Venta',
    'fichas-costo': 'Fichas de Costo',
    'fichas-precio': 'Fichas de Precio',
    pedidos: 'Pedidos Online',
    traza: 'Traza de Operaciones',
    salvas: 'Salvas del Negocio',
    usuarios: 'Usuarios y Roles',
    master: 'Configuración Master',
    sync: 'Sincronización',
  };
  return map[key] ?? key;
}
