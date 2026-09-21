/**
 * Minimal key-value storage abstraction.
 * Default implementation uses localStorage; swap for tests or IndexedDB later.
 */

export type KeyValueStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
};

export function createLocalStorageAdapter(prefix = 'abacophy:'): KeyValueStorage {
  const k = (key: string) => `${prefix}${key}`;

  return {
    get(key) {
      try {
        return localStorage.getItem(k(key));
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(k(key), value);
      } catch {
        /* quota / private mode */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(k(key));
      } catch {
        /* ignore */
      }
    },
    clear() {
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const item = localStorage.key(i);
          if (item?.startsWith(prefix)) keys.push(item);
        }
        keys.forEach((item) => localStorage.removeItem(item));
      } catch {
        /* ignore */
      }
    },
  };
}

/** In-memory storage for tests or SSR-safe defaults */
export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

/** Well-known keys used by infrastructure / identity */
export const StorageKeys = {
  authToken: 'auth.token',
  theme: 'ui.theme',
} as const;
