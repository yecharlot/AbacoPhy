/**
 * Autorización UI.
 * 1) Política FE por rol (si produce pantallas) — restringe el menú.
 * 2) Si falla o queda vacío → session.views del backend (comportamiento estable).
 */
import type { Session } from './entities/Session';
import { resolveScreensForSession } from './resolveUiAccess';

export type BackendView = string;

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

export function viewsOf(session: Session | null | undefined): Set<string> {
  return new Set(session?.views ?? []);
}

/** Pantallas permitidas por backend (session.views → screen ids). */
export function screensFromSessionViews(session: Session | null | undefined): string[] {
  if (!session?.views?.length) return [];
  const vset = viewsOf(session);
  const out: string[] = [];
  for (const [screen, keys] of Object.entries(SCREEN_VIEWS)) {
    if (keys.some((k) => vset.has(k))) out.push(screen);
  }
  return out;
}

function feScreensSafe(session: Session): string[] {
  try {
    const list = resolveScreensForSession(session);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Pantallas efectivas para menú y canAccess. */
export function effectiveScreens(session: Session | null | undefined): string[] {
  if (!session) return [];
  const fe = feScreensSafe(session);
  if (fe.length > 0) return fe;
  const fromBackend = screensFromSessionViews(session);
  if (fromBackend.length > 0) return fromBackend;
  // Último recurso para no dejar shell vacío
  const role = (session.user?.role || '').toLowerCase();
  if (role === 'vendedor') return ['pos'];
  if (role === 'master' || role === 'admin') return ['dashboard', 'usuarios', 'master'].filter(Boolean);
  return ['dashboard'];
}

export function canAccessScreen(
  session: Session | null | undefined,
  screenId: string,
): boolean {
  if (!session) return false;
  const id = screenId === 'home' ? 'dashboard' : screenId;
  const allowed = effectiveScreens(session);
  return allowed.includes(id);
}

export function canAccessView(
  session: Session | null | undefined,
  view: string,
): boolean {
  if (!session) return false;
  if (viewsOf(session).has(view)) return true;
  const allowed = effectiveScreens(session);
  for (const [screen, keys] of Object.entries(SCREEN_VIEWS)) {
    if (keys.includes(view) && allowed.includes(screen)) return true;
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
    'usuarios',
  ];
  for (const id of order) {
    if (canAccessScreen(session, id)) return id;
  }
  const eff = effectiveScreens(session);
  return eff[0] || 'dashboard';
}
