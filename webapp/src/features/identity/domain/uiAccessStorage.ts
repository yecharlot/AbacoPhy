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
 * Carga la configuración de interfaz guardada.
 * Busca primero la clave canónica global (fuente de verdad universal del frontend).
 * Si hay un tenantId específico configurado, se evalúa con prioridad local si contiene datos.
 * IMPORTANTE: No se hace merge ciego de claves porque mezclar claves de distintas fechas
 * provoca que datos obsoletos sobreescriban las configuraciones recientes.
 */
export function loadUiAccessConfig(tenantId?: string | null): UiAccessConfig {
  if (!canUseStorage()) return emptyUiAccessConfig();
  try {
    const t = (tenantId || '').trim();
    // Prioridad canónica:
    // 1. Clave global canónica (fuente de verdad configurada por Master/Admin en la UI)
    // 2. Clave específica del tenant si existe
    // 3. Clave default
    const candidateKeys = [
      UI_ACCESS_GLOBAL_KEY,
      t ? keyFor(t) : null,
      keyFor('default'),
    ].filter(Boolean) as string[];

    for (const k of candidateKeys) {
      const parsed = parseConfig(localStorage.getItem(k));
      if (
        parsed &&
        (Object.keys(parsed.roleScreens || {}).length > 0 ||
          Object.keys(parsed.userAccess || {}).length > 0)
      ) {
        return parsed;
      }
    }

    // Si ninguna tiene overrides pero alguna existe parseable:
    for (const k of candidateKeys) {
      const parsed = parseConfig(localStorage.getItem(k));
      if (parsed) return parsed;
    }

    return emptyUiAccessConfig();
  } catch {
    return emptyUiAccessConfig();
  }
}

/** 
 * Guarda en global + tenant + default para garantizar que cualquier sesión
 * (sea master sin tenant, o usuario dentro de un tenant) encuentre exactamente
 * la misma configuración guardada, sin discrepancias.
 */
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
    const t = (tenantId || '').trim();
    // 1. Guardar en la clave global universal
    localStorage.setItem(UI_ACCESS_GLOBAL_KEY, raw);
    // 2. Sincronizar clave de default
    localStorage.setItem(keyFor('default'), raw);
    // 3. Sincronizar clave específica si hay tenant
    if (t) {
      localStorage.setItem(keyFor(t), raw);
    }

    // 4. Sincronizar todas las claves existentes con PREFIX en localStorage
    // para sobreescribir cualquier clave vieja que pueda haber quedado de sesiones previas
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          localStorage.setItem(k, raw);
        }
      }
    } catch {
      /* ignore */
    }

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
