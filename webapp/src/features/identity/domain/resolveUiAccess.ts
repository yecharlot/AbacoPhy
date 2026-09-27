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

function uniq(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Resuelve las pantallas UI autorizadas para un usuario.
 * Prioridad:
 * 1. Override individual (config FE o metadata.ui_access)
 * 2. Override global del rol en config FE
 * 3. Default de política por rol
 */
export function resolveScreensForUser(input: {
  role: string;
  userId?: string;
  metadata?: string | null;
  config?: UiAccessConfig;
  tenantId?: string | null;
}): string[] {
  const role = (input.role || '').trim().toLowerCase();
  const config = input.config ?? loadUiAccessConfig(input.tenantId);

  const roleBase =
    (config.roleScreens[role] && config.roleScreens[role].length > 0
      ? config.roleScreens[role]
      : defaultScreensForRole(role)) ?? [];

  let userOverride: UserUiAccess | null = null;
  if (input.userId && config.userAccess[input.userId]) {
    userOverride = config.userAccess[input.userId];
  }
  if (!userOverride) {
    userOverride = parseUserUiAccessFromMetadata(input.metadata);
  }

  if (!userOverride || !userOverride.screens?.length) {
    return uniq(roleBase);
  }

  if (userOverride.mode === 'extra') {
    return uniq([...roleBase, ...userOverride.screens]);
  }
  // replace
  return uniq(userOverride.screens);
}

export function resolveScreensForSession(
  session: Session | null | undefined,
  tenantId?: string | null,
): string[] {
  if (!session?.user) return [];
  return resolveScreensForUser({
    role: session.user.role,
    userId: session.user.id,
    metadata: session.user.metadata,
    tenantId: tenantId ?? session.user.tenantId,
  });
}
