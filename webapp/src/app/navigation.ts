/**
 * Minimal “active screen” state for phase 0 (no router library yet).
 * Replace with a real router when features land.
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
    'demo-a': 'Pantalla A',
    'demo-b': 'Pantalla B',
  };
  return map[id] ?? id;
}
