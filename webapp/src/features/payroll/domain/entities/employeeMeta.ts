/**
 * Extensión vía metadata (string JSON) sin tocar schema Employee API.
 */
export type LaborStatus = 'active' | 'inactive' | 'reactivated';

export type EmployeeMeta = {
  positionId?: string;
  positionName?: string;
  username?: string;
  userId?: string;
  laborStatus?: LaborStatus;
  /** Etiqueta de ubicación para listados (PDV o Oficina Central). */
  locationLabel?: string;
};

export function parseEmployeeMeta(raw?: string | null): EmployeeMeta {
  if (!raw || !String(raw).trim()) return {};
  try {
    const v = JSON.parse(String(raw));
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return v as EmployeeMeta;
  } catch {
    return {};
  }
}

export function mergeEmployeeMeta(
  raw: string | null | undefined,
  patch: Partial<EmployeeMeta>,
): string {
  const base = parseEmployeeMeta(raw);
  const next = { ...base, ...patch };
  // limpiar undefined
  for (const k of Object.keys(next) as (keyof EmployeeMeta)[]) {
    if (next[k] === undefined || next[k] === '') delete next[k];
  }
  return JSON.stringify(next);
}

export const CENTRAL_OFFICE_LABEL = 'Oficina Central';
