import {
  DEFAULT_JOB_POSITIONS,
  normalizePositionName,
  validateJobPositionRole,
  type CreateJobPositionInput,
  type JobPosition,
  type UpdateJobPositionInput,
} from '../../domain/entities/JobPosition';

const KEY_PREFIX = 'abacophy.jobPositions.v1';

function storageKey(tenantId: string): string {
  return `${KEY_PREFIX}:${tenantId || 'default'}`;
}

function readRaw(tenantId: string): JobPosition[] | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as JobPosition[];
  } catch {
    return null;
  }
}

function writeRaw(tenantId: string, list: JobPosition[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(storageKey(tenantId), JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

function seed(tenantId: string): JobPosition[] {
  const list: JobPosition[] = DEFAULT_JOB_POSITIONS.map((p, i) => ({
    id: `pos-default-${i + 1}`,
    name: p.name,
    role: p.role,
    active: p.active,
  }));
  writeRaw(tenantId, list);
  return list;
}

export function listJobPositions(tenantId: string): JobPosition[] {
  const existing = readRaw(tenantId);
  if (existing && existing.length > 0) return existing;
  return seed(tenantId);
}

export function saveJobPosition(
  tenantId: string,
  input: CreateJobPositionInput,
): JobPosition {
  const name = normalizePositionName(input.name);
  if (!name) throw new Error('El nombre del cargo es obligatorio');
  const role = validateJobPositionRole(input.role);
  const list = listJobPositions(tenantId);
  const dup = list.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() && p.active !== false,
  );
  if (dup) throw new Error(`Ya existe el cargo «${name}»`);
  const item: JobPosition = {
    id: `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    role,
    active: input.active !== false,
  };
  list.push(item);
  writeRaw(tenantId, list);
  return item;
}

export function updateJobPosition(
  tenantId: string,
  input: UpdateJobPositionInput,
): JobPosition {
  const list = listJobPositions(tenantId);
  const idx = list.findIndex((p) => p.id === input.id);
  if (idx < 0) throw new Error('Cargo no encontrado');
  const cur = list[idx];
  const next: JobPosition = {
    ...cur,
    name: input.name !== undefined ? normalizePositionName(input.name) : cur.name,
    role: input.role !== undefined ? validateJobPositionRole(input.role) : cur.role,
    active: input.active !== undefined ? input.active : cur.active,
  };
  if (!next.name) throw new Error('El nombre del cargo es obligatorio');
  list[idx] = next;
  writeRaw(tenantId, list);
  return next;
}

export function filterActivePositions(list: JobPosition[]): JobPosition[] {
  return list.filter((p) => p.active !== false);
}
