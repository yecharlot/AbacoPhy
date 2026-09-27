/**
 * Acceso a pantallas.
 * Fuente de verdad UI: política FE por rol + overrides (metadata / storage).
 * session.views del backend se ignora para mostrar menú (no se toca el backend).
 */
import type { Session } from './entities/Session';
import { resolveScreensForSession } from './resolveUiAccess';

/**
 * Mapeo pantalla → claves ViewACL (referencia / compat).
 * La autorización UI ya no depende de estas claves del backend.
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
  permisos: ['usuarios', 'master'],
  master: ['master'],
};

export function uiScreensOf(session: Session | null | undefined): Set<string> {
  return new Set(resolveScreensForSession(session));
}

/** @deprecated usar uiScreensOf — se mantiene por compat de imports */
export function viewsOf(session: Session | null | undefined): Set<string> {
  return uiScreensOf(session);
}

export function canAccessScreen(
  session: Session | null | undefined,
  screenId: string,
): boolean {
  if (!session) return false;
  const id = screenId === 'home' ? 'dashboard' : screenId;
  const allowed = uiScreensOf(session);
  if (allowed.size === 0) return false;
  return allowed.has(id);
}

export function canAccessView(
  session: Session | null | undefined,
  view: string,
): boolean {
  // Compat: si alguien pregunta por clave backend, mapear a pantallas que la usan
  if (!session) return false;
  const allowed = uiScreensOf(session);
  if (allowed.has(view)) return true;
  for (const [screen, keys] of Object.entries(SCREEN_VIEWS)) {
    if (keys.includes(view) && allowed.has(screen)) return true;
  }
  return false;
}

export function firstAllowedScreen(session: Session | null | undefined): string {
  const order = [
    'dashboard',
    'pos',
    'almacen',
    'reportes',
    'ingresos',
    'gastos',
    'recepcion',
    'catalog',
    'tenant',
  ];
  for (const id of order) {
    if (canAccessScreen(session, id)) return id;
  }
  for (const id of uiScreensOf(session)) {
    return id;
  }
  return 'dashboard';
}
