/**
 * Extensión vía metadata (JSON) sin tocar schema Employee del API Go.
 */
export type LaborStatus = 'active' | 'inactive' | 'reactivated';

export type EmployeeMeta = {
  positionId?: string;
  positionName?: string;
  username?: string;
  userId?: string;
  laborStatus?: LaborStatus;
  locationLabel?: string;
  unitIds?: string[];
  contactEmail?: string;
  /** URL de foto de perfil (pegada por el administrador). */
  avatarUrl?: string;
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
  const next: EmployeeMeta = { ...base, ...patch };
  for (const k of Object.keys(next) as (keyof EmployeeMeta)[]) {
    const v = next[k];
    if (v === undefined || v === '') delete next[k];
    if (Array.isArray(v) && v.length === 0) delete next[k];
  }
  return JSON.stringify(next);
}

export const CENTRAL_OFFICE_LABEL = 'Oficina Central';
