/**
 * Minimal “active screen” state (no router library yet).
 */

export type ScreenId = string;

let current: ScreenId = 'home';
const listeners = new Set<(id: ScreenId) => void>();

export function getScreen(): ScreenId {
  return current;
}

export function setScreen(id: ScreenId): void {
  if (id === current) return;
  current = id;
  listeners.forEach((fn) => fn(current));
}

export function subscribeScreen(fn: (id: ScreenId) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function screenTitle(id: ScreenId): string {
  const map: Record<string, string> = {
    home: 'Inicio',
    tenant: 'Negocio',
    'demo-a': 'Pantalla A',
    'demo-b': 'Pantalla B',
  };
  return map[id] ?? id;
}
