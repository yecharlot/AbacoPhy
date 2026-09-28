import {
  emptyUiAccessConfig,
  type UiAccessConfig,
  type UserUiAccess,
} from './uiAccessPolicy';

/** Clave canónica — siempre se escribe y se lee primero. */
export const UI_ACCESS_GLOBAL_KEY = 'abacophy.uiAccess.v1:global';
const PREFIX = 'abacophy.uiAccess.v1';

function keyFor(tenantId: string | null | undefined): string {
  const t = (tenantId || '').trim();
  return t ? `${PREFIX}:${t}` : `${PREFIX}:default`;
}

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function parseConfig(raw: string | null): UiAccessConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UiAccessConfig;
    if (!parsed || Number(parsed.version) !== 1) return null;
    return {
      version: 1,
      roleScreens:
        parsed.roleScreens && typeof parsed.roleScreens === 'object'
          ? { ...parsed.roleScreens }
          : {},
      userAccess:
        parsed.userAccess && typeof parsed.userAccess === 'object'
          ? { ...parsed.userAccess }
          : {},
    };
  } catch {
    return null;
  }
}

function mergeConfigs(base: UiAccessConfig, extra: UiAccessConfig): UiAccessConfig {
  return {
    version: 1,
    roleScreens: { ...base.roleScreens, ...extra.roleScreens },
    userAccess: { ...base.userAccess, ...extra.userAccess },
  };
}

/**
 * Carga: global → tenant → default → resto de claves del prefijo.
 * Así el login encuentra lo que guardó Permisos aunque cambie tenantId.
 */
export function loadUiAccessConfig(tenantId?: string | null): UiAccessConfig {
  if (!canUseStorage()) return emptyUiAccessConfig();
  try {
    let acc = emptyUiAccessConfig();
    const ordered: string[] = [
      UI_ACCESS_GLOBAL_KEY,
      keyFor(tenantId),
      keyFor('default'),
      keyFor(''),
    ];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX) && !ordered.includes(k)) ordered.push(k);
      }
    } catch {
      /* ignore */
    }
    for (const k of ordered) {
      const parsed = parseConfig(localStorage.getItem(k));
      if (parsed) acc = mergeConfigs(acc, parsed);
    }
    return acc;
  } catch {
    return emptyUiAccessConfig();
  }
}

/** Guarda en global + tenant + default. */
export function saveUiAccessConfig(
  tenantId: string | null | undefined,
  config: UiAccessConfig,
): void {
  if (!canUseStorage()) return;
  const payload: UiAccessConfig = {
    version: 1,
    roleScreens: { ...(config.roleScreens || {}) },
    userAccess: { ...(config.userAccess || {}) },
  };
  const raw = JSON.stringify(payload);
  try {
    localStorage.setItem(UI_ACCESS_GLOBAL_KEY, raw);
    localStorage.setItem(keyFor(tenantId), raw);
    localStorage.setItem(keyFor('default'), raw);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('abacophy-ui-access-changed', { detail: payload }),
      );
    }
  } catch {
    /* quota */
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
    return {
      mode: ua.mode === 'replace' ? 'replace' : 'extra',
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
