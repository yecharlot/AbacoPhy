import type { Session } from './entities/Session';
import { defaultScreensForRole } from './uiAccessPolicy';
import { isKnownProductRole, resolveScreensForSession } from './resolveUiAccess';
import { loadUiAccessConfig } from './uiAccessStorage';

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

function feScreensSafe(session: Session): string[] {
  try {
    return resolveScreensForSession(session).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Roles de producto: solo política FE (panel o default).
 * No ampliar con ViewACL del backend.
 */
export function effectiveScreens(session: Session | null | undefined): string[] {
  if (!session) return [];
  const role = String(session.user?.role || '').trim().toLowerCase();

  const fe = feScreensSafe(session);
  if (fe.length > 0) return fe;

  // Si fe está vacío, verificar si fue explícitamente configurado como vacío en la política FE
  try {
    const config = loadUiAccessConfig(session.user?.tenantId);
    if (session.user?.id && config.userAccess?.[session.user.id]) {
      return config.userAccess[session.user.id].screens || [];
    }
    if (session.user?.username && config.userAccess?.[session.user.username]) {
      return config.userAccess[session.user.username].screens || [];
    }
    if (Array.isArray(config.roleScreens?.[role])) {
      return config.roleScreens[role];
    }
  } catch {
    /* fallback */
  }

  if (isKnownProductRole(role)) {
    const d = defaultScreensForRole(role);
    if (d.length) return d;
  }

  const backend = screensFromSessionViews(session);
  if (backend.length) return backend;

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
