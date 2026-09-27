/**
 * Acceso a pantallas (UI).
 * Política FE por rol + overrides; fallback a session.views del backend si hace falta.
 * Nunca debe dejar al usuario autenticado sin ninguna pantalla usable.
 */
import type { Session } from './entities/Session';
import { resolveScreensForSession, screensFromBackendViews } from './resolveUiAccess';
import { SCREEN_VIEWS } from './screenViews';

export { SCREEN_VIEWS };

export function uiScreensOf(session: Session | null | undefined): Set<string> {
  if (!session) return new Set();
  try {
    let screens = resolveScreensForSession(session);
    if (screens.length === 0 && session.views?.length) {
      screens = screensFromBackendViews(session.views);
    }
    return new Set(screens);
  } catch {
    return new Set(screensFromBackendViews(session.views));
  }
}

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
  if (allowed.size === 0) {
    // Último recurso: no bloquear todo el shell (evita pantalla negra / Forbidden eterno)
    return id === 'dashboard' || id === 'pos';
  }
  return allowed.has(id);
}

export function canAccessView(
  session: Session | null | undefined,
  view: string,
): boolean {
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
    'usuarios',
  ];
  for (const id of order) {
    if (canAccessScreen(session, id)) return id;
  }
  const allowed = [...uiScreensOf(session)];
  if (allowed.length) return allowed[0];
  return 'dashboard';
}
