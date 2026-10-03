import { describe, it, expect } from 'vitest';
import {
  effectiveScreens,
  canAccessScreen,
  screensFromSessionViews,
  modulesFromScreenChecks,
} from '../../../features/identity/domain/access';
import type { Session } from '../../../features/identity/domain/entities/Session';

function session(partial: Partial<Session> & { role?: string; views?: string[] }): Session {
  return {
    token: 'tok',
    expiresAt: null,
    user: {
      id: 'u1',
      username: 'user1',
      displayName: 'User 1',
      role: partial.role || 'vendedor',
      tenantId: 'demo',
    },
    views: partial.views ?? [],
    modules: {},
    ...partial,
  };
}

describe('effectiveScreens (backend session.views)', () => {
  it('maps backend views to UI screens requiring all keys', () => {
    const s = session({
      role: 'vendedor',
      views: ['vendedor', 'productos', 'nomencladores'],
    });
    expect(screensFromSessionViews(s).sort()).toEqual(['catalog', 'pos'].sort());
    expect(effectiveScreens(s).sort()).toEqual(['catalog', 'pos'].sort());
    expect(canAccessScreen(s, 'pos')).toBe(true);
    expect(canAccessScreen(s, 'catalog')).toBe(true);
    expect(canAccessScreen(s, 'gastos')).toBe(false);
  });

  it('does not use localStorage legacy policy', () => {
    const s = session({ role: 'vendedor', views: ['vendedor'] });
    expect(effectiveScreens(s)).toEqual(['pos']);
  });

  it('modulesFromScreenChecks expands UI screens to backend keys', () => {
    const mods = modulesFromScreenChecks({ pos: true, catalog: true, gastos: false });
    expect(mods.vendedor).toBe(true);
    expect(mods.productos).toBe(true);
    expect(mods.nomencladores).toBe(true);
    expect(mods.gastos).toBe(false);
  });
});
