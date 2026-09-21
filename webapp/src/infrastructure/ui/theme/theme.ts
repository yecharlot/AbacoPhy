import type { KeyValueStorage } from '../../data/storage';
import { StorageKeys } from '../../data/storage';

export type ThemeMode = 'light' | 'dark';

/** Product default is dark (DESIGN.md ethereal language). */
export function readStoredTheme(storage: KeyValueStorage): ThemeMode {
  const v = storage.get(StorageKeys.theme);
  if (v === 'light') return 'light';
  return 'dark';
}

export function applyTheme(mode: ThemeMode, storage?: KeyValueStorage): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
  }
  storage?.set(StorageKeys.theme, mode);
}

export function toggleTheme(current: ThemeMode, storage?: KeyValueStorage): ThemeMode {
  const next: ThemeMode = current === 'light' ? 'dark' : 'light';
  applyTheme(next, storage);
  return next;
}
