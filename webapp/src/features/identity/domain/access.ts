import type { Session } from './entities/Session';
import { defaultScreensForRole } from './uiAccessPolicy';
import { isKnownProductRole, resolveScreensForSession } from './resolveUiAccess';

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

export function screensFromSessionViews(session: Session | null | undefined): string[] {
  if (!session?.views?.length) return [];
  const vset = viewsOf(session);
  const out: string[] = [];
  for (const [screen, keys] of Object.entries(SCREEN_VIEWS)) {
    if (keys.some((k) => vset.has(k))) out.push(screen);
  }
  return out;
}

/**
 * The backend is the source of truth for the authenticated user's effective
 * permissions. /auth/login and /auth/me return `views` already resolved as
 * role permissions plus explicit per-user grants/revokes.
 *
 * Frontend-only local UI policy is intentionally kept only as a legacy fallback
 * for sessions created by older clients/tests that do not contain backend views.
 */
export function effectiveScreens(session: Session | null | undefined): string[] {
  if (!session) return [];

  const backend = screensFromSessionViews(session);
  if (backend.length > 0) return backend;

  // Legacy fallback only: never overrides backend-provided permissions.
  const fe = resolveScreensForSession(session).filter(Boolean);
  if (fe.length > 0) return fe;

  const role = String(session.user?.role || '').trim().toLowerCase();
  if (isKnownProductRole(role)) {
    const d = defaultScreensForRole(role);
    if (d.length) return d;
  }

  if (role === 'vendedor') return ['pos'];
  if (role === 'master' || role === 'admin') {
    return ['dashboard', 'usuarios', 'permisos', 'master'];
  }
  return ['dashboard'];
}

export function canAccessScreen(
  session: Session | null | undefined,
  screenId: string,
): boolean {
  if (!session) return false;
  const id = screenId === 'home' ? 'dashboard' : screenId;
  return effectiveScreens(session).includes(id);
}

export function canAccessView(
  session: Session | null | undefined,
  view: string,
): boolean {
  if (!session) return false;
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
    'catalog',
    'reportes',
    'ingresos',
    'gastos',
    'recepcion',
    'tenant',
    'usuarios',
  ];
  for (const id of order) {
    if (canAccessScreen(session, id)) return id;
  }
  return effectiveScreens(session)[0] || 'dashboard';
}
