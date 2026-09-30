import { describe, it, expect, beforeEach } from 'vitest';
import { saveUiAccessConfig, loadUiAccessConfig } from '../../../features/identity/domain/uiAccessStorage';
import { resolveScreensForUser, resolveScreensForSession } from '../../../features/identity/domain/resolveUiAccess';
import { effectiveScreens, canAccessScreen } from '../../../features/identity/domain/access';
import type { Session } from '../../../features/identity/domain/entities/Session';

describe('UI Access Frontend Permission System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('vendedor defaults to pos only if not customized', () => {
    const screens = resolveScreensForUser({ role: 'vendedor' });
    expect(screens).toEqual(['pos']);
  });

  it('persists role customizations and overrides defaults as frontend source of truth', () => {
    // Master configures vendedor to have catalog and pos
    const config = {
      version: 1 as const,
      roleScreens: {
        vendedor: ['pos', 'catalog'],
      },
      userAccess: {},
    };

    saveUiAccessConfig('', config);

    // Verify loading directly
    const loaded = loadUiAccessConfig('demo');
    expect(loaded.roleScreens.vendedor).toEqual(['pos', 'catalog']);

    // Verify resolveScreensForUser for vendedor in tenant demo
    const screens = resolveScreensForUser({ role: 'vendedor', tenantId: 'demo' });
    expect(screens).toEqual(['pos', 'catalog']);

    // Verify session
    const mockSession: Session = {
      token: 'tok',
      expiresAt: null,
      user: {
        id: 'u1',
        username: 'vendedor1',
        displayName: 'Vendedor 1',
        role: 'vendedor',
        tenantId: 'demo',
      },
      views: ['vendedor'], // backend views
      modules: {},
    };

    expect(resolveScreensForSession(mockSession)).toEqual(['pos', 'catalog']);
    expect(effectiveScreens(mockSession)).toEqual(['pos', 'catalog']);
    expect(canAccessScreen(mockSession, 'pos')).toBe(true);
    expect(canAccessScreen(mockSession, 'catalog')).toBe(true);
    expect(canAccessScreen(mockSession, 'gastos')).toBe(false);
  });

  it('supports user-specific overrides beyond role package', () => {
    const config = {
      version: 1 as const,
      roleScreens: {
        vendedor: ['pos'],
      },
      userAccess: {
        u1: {
          mode: 'extra' as const,
          screens: ['catalog', 'reportes'],
        },
      },
    };

    saveUiAccessConfig('demo', config);

    const mockSession: Session = {
      token: 'tok',
      expiresAt: null,
      user: {
        id: 'u1',
        username: 'vendedor1',
        displayName: 'Vendedor 1',
        role: 'vendedor',
        tenantId: 'demo',
      },
      views: ['vendedor'],
      modules: {},
    };

    const screens = effectiveScreens(mockSession);
    expect(screens).toEqual(['pos', 'catalog', 'reportes']);
    expect(canAccessScreen(mockSession, 'reportes')).toBe(true);
  });

  it('supports user-specific override in replace mode', () => {
    const config = {
      version: 1 as const,
      roleScreens: {
        vendedor: ['pos', 'catalog'],
      },
      userAccess: {
        u1: {
          mode: 'replace' as const,
          screens: ['dashboard'],
        },
      },
    };

    saveUiAccessConfig('', config);

    const mockSession: Session = {
      token: 'tok',
      expiresAt: null,
      user: {
        id: 'u1',
        username: 'vendedor1',
        displayName: 'Vendedor 1',
        role: 'vendedor',
        tenantId: 'demo',
      },
      views: ['vendedor'],
      modules: {},
    };

    const screens = effectiveScreens(mockSession);
    expect(screens).toEqual(['dashboard']);
    expect(canAccessScreen(mockSession, 'pos')).toBe(false);
    expect(canAccessScreen(mockSession, 'dashboard')).toBe(true);
  });
});
