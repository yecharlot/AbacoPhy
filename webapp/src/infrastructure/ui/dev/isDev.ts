/**
 * Solo desarrollo / pruebas. Nunca mostrar seed en build de producción
 * salvo que se fuerce explícitamente VITE_ENABLE_DEV_SEED=true.
 */
export function isDevSeedEnabled(): boolean {
  try {
    // Vite
    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    if (env?.VITE_ENABLE_DEV_SEED === 'true') return true;
    if (env?.VITE_ENABLE_DEV_SEED === 'false') return false;
    if (env?.DEV === true || env?.MODE === 'development') return true;
  } catch {
    /* no-op */
  }
  return false;
}
