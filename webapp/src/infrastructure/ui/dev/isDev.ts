/** Seed solo en entorno de prueba / desarrollo. */
export function isDevSeedEnabled(): boolean {
  try {
    const env = (import.meta as ImportMeta & {
      env?: { DEV?: boolean; MODE?: string; VITE_ENABLE_DEV_SEED?: string };
    }).env;

    if (env?.VITE_ENABLE_DEV_SEED === 'true') return true;
    if (env?.VITE_ENABLE_DEV_SEED === 'false') return false;

    // Vite dev server
    if (env?.DEV === true) return true;
    if (env?.MODE === 'development') return true;

    // Por si el bundle se sirve desde el backend Go en local
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
