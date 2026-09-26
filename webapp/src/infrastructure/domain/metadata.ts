/**
 * Metadata flexible por entidad (compat de versión).
 * - Campo opcional en entidad/DTO: metadata?: string | null
 * - Si no viene del API → undefined / {} al parsear; la UI no rompe.
 */

export type MetaMap = Record<string, unknown>;

export type WithMetadata = {
  metadata?: string | null;
};

/** Parse seguro. Acepta string JSON u objeto. Nunca lanza. */
export function parseMetadata(raw: unknown): MetaMap {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...(raw as MetaMap) };
  if (typeof raw !== 'string') return {};
  const s = raw.trim();
  if (!s || s === 'null') return {};
  try {
    const v = JSON.parse(s) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as MetaMap;
    return {};
  } catch {
    return {};
  }
}

/** Serializa para enviar/persistir. Vacío → undefined (omit en JSON). */
export function stringifyMetadata(map: MetaMap | null | undefined): string | undefined {
  if (!map || Object.keys(map).length === 0) return undefined;
  try {
    return JSON.stringify(map);
  } catch {
    return undefined;
  }
}

/**
 * Normaliza campo metadata desde DTO (string | object | ausente)
 * → string | undefined para la entidad de dominio.
 */
export function normalizeMetadataField(dto: { metadata?: unknown } | null | undefined): string | undefined {
  if (dto == null || dto.metadata == null || dto.metadata === '') return undefined;
  if (typeof dto.metadata === 'string') {
    const t = dto.metadata.trim();
    if (!t || t === 'null') return undefined;
    // Si no parsea, no propagamos basura
    const parsed = parseMetadata(t);
    return Object.keys(parsed).length > 0 ? t : undefined;
  }
  return stringifyMetadata(parseMetadata(dto.metadata));
}

/** Para request DTO: solo incluir si hay valor. */
export function metadataToDto(entity: { metadata?: string | null } | null | undefined): string | undefined {
  if (!entity?.metadata) return undefined;
  const t = String(entity.metadata).trim();
  return t || undefined;
}

export function metadataGet<T = unknown>(raw: unknown, key: string): T | undefined {
  const m = parseMetadata(raw);
  if (!(key in m)) return undefined;
  return m[key] as T;
}

export function metadataSet(raw: unknown, key: string, value: unknown): string | undefined {
  const m = parseMetadata(raw);
  if (value === undefined) delete m[key];
  else m[key] = value;
  return stringifyMetadata(m);
}
