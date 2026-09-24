import type { HttpClient } from '../../data/http';

/** Confirmación exacta exigida por POST /master/reset */
export const RESET_CONFIRMATION = 'REINICIAR';

/**
 * Reinicio de fábrica de la instancia (solo rol master).
 * Vacía tenants/datos y vuelve al bootstrap demo.
 */
export async function resetPlatformViaHttp(http: HttpClient): Promise<string> {
  const res = await http.post<{ message?: string; ok?: boolean }>('/master/reset', {
    confirm: RESET_CONFIRMATION,
  });
  return res.message ?? 'Plataforma reiniciada';
}
