import {
  emptyUiAccessConfig,
  type UiAccessConfig,
  type UserUiAccess,
} from './uiAccessPolicy';

const PREFIX = 'abacophy.uiAccess.v1';

function keyFor(tenantId: string | null | undefined): string {
  return `${PREFIX}:${tenantId || 'default'}`;
}

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

export function loadUiAccessConfig(tenantId?: string | null): UiAccessConfig {
  if (!canUseStorage()) return emptyUiAccessConfig();
  try {
    const raw = localStorage.getItem(keyFor(tenantId));
    if (!raw) return emptyUiAccessConfig();
    const parsed = JSON.parse(raw) as UiAccessConfig;
    if (!parsed || parsed.version !== 1) return emptyUiAccessConfig();
    return {
      version: 1,
      roleScreens: parsed.roleScreens || {},
      userAccess: parsed.userAccess || {},
    };
  } catch {
    return emptyUiAccessConfig();
  }
}

export function saveUiAccessConfig(
  tenantId: string | null | undefined,
  config: UiAccessConfig,
): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(keyFor(tenantId), JSON.stringify(config));
  } catch {
    /* quota / private mode */
  }
}

export function parseUserUiAccessFromMetadata(
  metadata: string | null | undefined,
): UserUiAccess | null {
  if (!metadata || !String(metadata).trim()) return null;
  try {
    const obj = JSON.parse(metadata) as Record<string, unknown>;
    const ua = obj.ui_access as UserUiAccess | undefined;
    if (!ua || !Array.isArray(ua.screens)) return null;
    const mode = ua.mode === 'extra' ? 'extra' : 'replace';
    return {
      mode,
      screens: ua.screens.map(String).filter(Boolean),
    };
  } catch {
    return null;
  }
}

export function mergeUiAccessIntoMetadata(
  metadata: string | null | undefined,
  access: UserUiAccess | null,
): string {
  let base: Record<string, unknown> = {};
  if (metadata && String(metadata).trim()) {
    try {
      const p = JSON.parse(metadata) as Record<string, unknown>;
      if (p && typeof p === 'object' && !Array.isArray(p)) base = { ...p };
    } catch {
      base = {};
    }
  }
  if (!access) delete base.ui_access;
  else base.ui_access = { mode: access.mode, screens: access.screens };
  return JSON.stringify(base);
}
