/**
 * Autorización en UI — espejo de internal/auth/auth.go ViewACL + session.views.
 *
 * Fuente de verdad del servidor:
 * - Rol del usuario → en BD (JSON store, campo user.role)
 * - ViewACL (rol → vistas) → en código Go
 * - Módulos del tenant → en BD (snapshot Modules)
 * - Login responde session.views = ViewsForRole(role, snap)
 *
 * La UI solo oculta/redirige; la API sigue validando con RequireView.
 */

import type { Session } from './entities/Session';

/** Claves de vista del backend (ViewACL). */
export type BackendView =
  | 'dashboard'
  | 'ingresos'
  | 'gastos'
  | 'cuentas'
  | 'inventario'
  | 'nomina'
  | 'facturas'
  | 'reportes'
  | 'usuarios'
  | 'tenant'
  | 'master'
  | 'sync'
  | 'monedas'
  | 'traza'
  | 'salvas'
  | 'cuentas_t'
  | 'nomencladores'
  | 'productos'
  | 'cargos'
  | 'measure_units'
  | 'almacen'
  | 'unidades'
  | 'recepcion'
  | 'vendedor'
  | 'fichas_costo'
  | 'fichas_precio'
  | 'pedidos_online'
  | 'tienda';

/**
 * Screen id (App.svelte / nav) → vista(s) ACL requeridas.
 * Basta con tener una de las vistas listadas.
 */
export const SCREEN_VIEWS: Record<string, string[]> = {
  home: ['dashboard', 'reportes'],
  dashboard: ['dashboard', 'reportes'],
  ingresos: ['ingresos'],
  gastos: ['gastos'],
  cuentas: ['cuentas', 'cuentas_t'],
  reportes: ['reportes'],
  facturas: ['facturas'],
  empleados: ['nomina'],
  liquidaciones: ['nomina'],
  catalog: ['nomencladores', 'productos'],
  tenant: ['tenant'],
  almacen: ['almacen', 'inventario'],
  recepcion: ['recepcion', 'almacen'],
  transferencias: ['almacen', 'unidades'],
  pos: ['vendedor'],
  'fichas-costo': ['fichas_costo'],
  'fichas-precio': ['fichas_precio'],
  pedidos: ['pedidos_online', 'tienda'],
  traza: ['traza'],
  salvas: ['salvas'],
  usuarios: ['usuarios'],
  master: ['master'],
};

export function viewsOf(session: Session | null | undefined): Set<string> {
  return new Set(session?.views ?? []);
}

/** true si la sesión puede abrir esa pantalla. */
export function canAccessScreen(
  session: Session | null | undefined,
  screenId: string,
): boolean {
  if (!session) return false;
  const required = SCREEN_VIEWS[screenId];
  if (!required || required.length === 0) return true;
  const views = viewsOf(session);
  if (views.size === 0) return false;
  return required.some((v) => views.has(v));
}

export function canAccessView(
  session: Session | null | undefined,
  view: string,
): boolean {
  if (!session) return false;
  return viewsOf(session).has(view);
}

/** Primera pantalla permitida (para redirigir tras login o al denegar). */
export function firstAllowedScreen(session: Session | null | undefined): string {
  const order = [
    'dashboard',
    'ingresos',
    'gastos',
    'reportes',
    'pos',
    'almacen',
    'catalog',
    'tenant',
  ];
  for (const id of order) {
    if (canAccessScreen(session, id)) return id;
  }
  // fallback: cualquier nav conocida
  for (const id of Object.keys(SCREEN_VIEWS)) {
    if (canAccessScreen(session, id)) return id;
  }
  return 'dashboard';
}
