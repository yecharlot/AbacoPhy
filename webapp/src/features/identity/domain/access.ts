import type { Session } from './entities/Session';

/**
 * Mapeo pantalla UI (nav) → claves de vista del backend (ViewACL / RolePermissions / User.Modules).
 * Una pantalla requiere TODAS sus claves presentes en session.views.
 */
export const SCREEN_VIEWS: Record<string, string[]> = {
  home: ['dashboard'],
  dashboard: ['dashboard'],
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
  recepcion: ['recepcion'],
  transferencias: ['unidades'],
  pos: ['vendedor'],
  'fichas-costo': ['fichas_costo'],
  'fichas-precio': ['fichas_precio'],
  pedidos: ['pedidos_online'],
  traza: ['traza'],
  salvas: ['salvas'],
  usuarios: ['usuarios'],
  permisos: ['usuarios'],
  master: ['master'],
};

export function viewsOf(session: Session | null | undefined): Set<string> {
  return new Set(session?.views ?? []);
}

/** Pantallas UI derivadas solo de session.views (backend). */
export function screensFromSessionViews(session: Session | null | undefined): string[] {
  if (!session?.views?.length) return [];
  const vset = viewsOf(session);
  const out: string[] = [];
  for (const [screen, keys] of Object.entries(SCREEN_VIEWS)) {
    if (screen === 'home') continue;
    if (keys.length > 0 && keys.every((k) => vset.has(k))) out.push(screen);
  }
  return out;
}

/**
 * Fuente de verdad: views del login /auth/me (rol persistido + grants usuario).
 * Sin fallback a localStorage ni ROLE_DEFAULT_SCREENS.
 */
export function effectiveScreens(session: Session | null | undefined): string[] {
  if (!session) return [];
  const backend = screensFromSessionViews(session);
  if (backend.length > 0) return backend;

  const role = String(session.user?.role || '')
    .trim()
    .toLowerCase();
  // Sesión sin views (token roto / backend antiguo): mínimo operable
  if (role === 'master') return ['dashboard', 'usuarios', 'permisos', 'master', 'tenant'];
  if (role === 'admin') return ['dashboard', 'usuarios', 'permisos', 'tenant'];
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
  return viewsOf(session).has(view);
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
    'permisos',
  ];
  for (const id of order) {
    if (canAccessScreen(session, id)) return id;
  }
  return effectiveScreens(session)[0] || 'dashboard';
}

/** Todas las claves de vista backend usadas por el panel de permisos UI. */
export function allBackendViewKeys(): string[] {
  const s = new Set<string>();
  for (const keys of Object.values(SCREEN_VIEWS)) {
    for (const k of keys) s.add(k);
  }
  return [...s];
}

/**
 * Construye mapa de permisos backend a partir de checkboxes de pantallas UI.
 * Claves compartidas entre pantallas: true si alguna pantalla que las usa está activa.
 */
export function modulesFromScreenChecks(
  checked: Record<string, boolean>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of allBackendViewKeys()) {
    out[key] = false;
  }
  for (const [screenId, on] of Object.entries(checked)) {
    if (!on) continue;
    for (const key of SCREEN_VIEWS[screenId] ?? []) {
      out[key] = true;
    }
  }
  return out;
}
