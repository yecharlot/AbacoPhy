import type { Session } from './entities/Session';
import {
  defaultScreensForRole,
  type UiAccessConfig,
  type UserUiAccess,
} from './uiAccessPolicy';
import {
  loadUiAccessConfig,
  parseUserUiAccessFromMetadata,
} from './uiAccessStorage';
import { SCREEN_VIEWS } from './screenViews';

function uniq(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

/** Mapea claves ViewACL del backend → ids de pantalla FE. */
export function screensFromBackendViews(views: string[] | null | undefined): string[] {
  if (!views || views.length === 0) return [];
  const set = new Set(views);
  const out: string[] = [];
  for (const [screen, keys] of Object.entries(SCREEN_VIEWS)) {
    if (keys.some((k) => set.has(k))) out.push(screen);
  }
  return uniq(out);
}

export function resolveScreensForUser(input: {
  role: string;
  userId?: string;
  metadata?: string | null;
  config?: UiAccessConfig;
  tenantId?: string | null;
  /** Fallback si el rol no tiene política FE. */
  backendViews?: string[] | null;
}): string[] {
  try {
    const role = (input.role || '').trim().toLowerCase();
    const config = input.config ?? loadUiAccessConfig(input.tenantId);

    const roleBase =
      config.roleScreens[role]?.length > 0
        ? config.roleScreens[role]
        : defaultScreensForRole(role);

    let userOverride: UserUiAccess | null = null;
    if (input.userId && config.userAccess[input.userId]) {
      userOverride = config.userAccess[input.userId];
    }
    if (!userOverride) {
      userOverride = parseUserUiAccessFromMetadata(input.metadata);
    }

    let screens: string[] = [];
    if (userOverride?.screens?.length) {
      screens =
        userOverride.mode === 'extra'
          ? uniq([...(roleBase || []), ...userOverride.screens])
          : uniq(userOverride.screens);
    } else {
      screens = uniq(roleBase || []);
    }

    // Si quedó vacío (rol desconocido / config rota), no dejar UI ciega
    if (screens.length === 0 && input.backendViews?.length) {
      screens = screensFromBackendViews(input.backendViews);
    }
    return screens;
  } catch {
    return screensFromBackendViews(input.backendViews);
  }
}

export function resolveScreensForSession(
  session: Session | null | undefined,
  tenantId?: string | null,
): string[] {
  if (!session?.user) return [];
  try {
    return resolveScreensForUser({
      role: session.user.role || '',
      userId: session.user.id,
      metadata: session.user.metadata,
      tenantId: tenantId ?? session.user.tenantId,
      backendViews: session.views,
    });
  } catch {
    return screensFromBackendViews(session.views);
  }
}
