import type { Session } from './entities/Session';
import {
  defaultScreensForRole,
  ROLE_DEFAULT_SCREENS,
  type UiAccessConfig,
  type UserUiAccess,
} from './uiAccessPolicy';
import {
  loadUiAccessConfig,
  parseUserUiAccessFromMetadata,
} from './uiAccessStorage';

function uniq(ids: string[]): string[] {
  return [...new Set((ids || []).map(String).map((s) => s.trim()).filter(Boolean))];
}

function normalizeRole(role: string): string {
  return String(role || '').trim().toLowerCase();
}

/**
 * 1) roleScreens[rol] del panel (si existe y no vacío) → esa lista exacta
 * 2) si no → ROLE_DEFAULT_SCREENS[rol]
 * 3) + userAccess / metadata (extra = unión, replace = sustituye)
 */
export function resolveScreensForUser(input: {
  role: string;
  userId?: string;
  metadata?: string | null;
  config?: UiAccessConfig;
  tenantId?: string | null;
}): string[] {
  try {
    const role = normalizeRole(input.role);
    const config = input.config ?? loadUiAccessConfig(input.tenantId);

    // Panel guardó override de este rol
    const panel = config.roleScreens?.[role];
    const roleBase =
      Array.isArray(panel) && panel.length > 0
        ? panel.map(String)
        : defaultScreensForRole(role);

    let userOverride: UserUiAccess | null = null;
    if (input.userId && config.userAccess?.[input.userId]) {
      userOverride = config.userAccess[input.userId];
    }
    if (!userOverride) {
      userOverride = parseUserUiAccessFromMetadata(input.metadata);
    }

    if (userOverride?.screens?.length) {
      if (userOverride.mode === 'replace') {
        return uniq(userOverride.screens);
      }
      return uniq([...roleBase, ...userOverride.screens]);
    }

    return uniq(roleBase);
  } catch {
    return [];
  }
}

export function resolveScreensForSession(
  session: Session | null | undefined,
  tenantId?: string | null,
): string[] {
  if (!session?.user) return [];
  try {
    const tid =
      tenantId ??
      session.user.tenantId ??
      null;
    return resolveScreensForUser({
      role: session.user.role || '',
      userId: session.user.id,
      metadata: session.user.metadata ?? null,
      tenantId: tid,
    });
  } catch {
    return [];
  }
}

export function isKnownProductRole(role: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    ROLE_DEFAULT_SCREENS,
    normalizeRole(role),
  );
}
