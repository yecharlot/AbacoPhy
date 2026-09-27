/**
 * Persistencia FE de la política de pantallas.
 * - localStorage por tenant (overrides de rol y de usuario)
 * - Forma alineada a metadata.ui_access para futuros sync con API
 */
import {
  emptyUiAccessConfig,
  type UiAccessConfig,
  type UserUiAccess,
} from './uiAccessPolicy';

const PREFIX = 'abacophy.uiAccess.v1';

function keyFor(tenantId: string | null | undefined): string {
  return `${PREFIX}:${tenantId || 'default'}`;
}

export function loadUiAccessConfig(tenantId?: string | null): UiAccessConfig {
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
  localStorage.setItem(keyFor(tenantId), JSON.stringify(config));
}

/** Lee ui_access desde metadata JSON string del usuario (si existe). */
export function parseUserUiAccessFromMetadata(
  metadata: string | null | undefined,
): UserUiAccess | null {
  if (!metadata || !metadata.trim()) return null;
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

/** Fusiona ui_access en un string metadata existente. */
export function mergeUiAccessIntoMetadata(
  metadata: string | null | undefined,
  access: UserUiAccess | null,
): string {
  let base: Record<string, unknown> = {};
  if (metadata && metadata.trim()) {
    try {
      const p = JSON.parse(metadata) as Record<string, unknown>;
      if (p && typeof p === 'object' && !Array.isArray(p)) base = { ...p };
    } catch {
      base = {};
    }
  }
  if (!access) {
    delete base.ui_access;
  } else {
    base.ui_access = {
      mode: access.mode,
      screens: access.screens,
    };
  }
  return JSON.stringify(base);
}
