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
  return [...new Set((ids || []).filter(Boolean))];
}

export function resolveScreensForUser(input: {
  role: string;
  userId?: string;
  metadata?: string | null;
  config?: UiAccessConfig;
  tenantId?: string | null;
}): string[] {
  try {
    const role = String(input.role || '').trim().toLowerCase();
    const config = input.config ?? loadUiAccessConfig(input.tenantId);

    const fromRoleConfig = config.roleScreens?.[role];
    const roleBase =
      fromRoleConfig && fromRoleConfig.length > 0
        ? fromRoleConfig
        : defaultScreensForRole(role);

    let userOverride: UserUiAccess | null = null;
    if (input.userId && config.userAccess?.[input.userId]) {
      userOverride = config.userAccess[input.userId];
    }
    if (!userOverride) {
      userOverride = parseUserUiAccessFromMetadata(input.metadata);
    }

    if (userOverride?.screens?.length) {
      if (userOverride.mode === 'extra') {
        return uniq([...(roleBase || []), ...userOverride.screens]);
      }
      return uniq(userOverride.screens);
    }
    return uniq(roleBase || []);
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
    return resolveScreensForUser({
      role: session.user.role || '',
      userId: session.user.id,
      metadata: session.user.metadata,
      tenantId: tenantId ?? session.user.tenantId,
    });
  } catch {
    return [];
  }
}
