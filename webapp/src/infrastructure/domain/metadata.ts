/**
 * Metadata opcional por entidad (JSON string).
 * Si el API no envía el campo, devolvemos undefined — la UI no rompe.
 */

export type MetaMap = Record<string, unknown>;

/** Acepta el DTO entero o el valor de metadata. Nunca lanza. */
export function normalizeMetadataField(source: unknown): string | undefined {
  let raw: unknown = source;
  if (
    source != null &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    'metadata' in (source as object)
  ) {
    raw = (source as { metadata?: unknown }).metadata;
  }
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    try {
      const s = JSON.stringify(raw);
      return s === '{}' ? undefined : s;
    } catch {
      return undefined;
    }
  }
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t || t === 'null' || t === '{}') return undefined;
  try {
    const v = JSON.parse(t) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return t;
    return undefined;
  } catch {
    return undefined;
  }
}

/** Para requests: solo incluye si hay valor. */
export function metadataToDto(source: unknown): string | undefined {
  return normalizeMetadataField(source);
}

export function parseMetadata(raw: unknown): MetaMap {
  const s = normalizeMetadataField(raw);
  if (!s) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && !('metadata' in (raw as object))) {
      return { ...(raw as MetaMap) };
    }
    return {};
  }
  try {
    return JSON.parse(s) as MetaMap;
  } catch {
    return {};
  }
}

export function stringifyMetadata(map: MetaMap | null | undefined): string | undefined {
  if (!map || Object.keys(map).length === 0) return undefined;
  try {
    return JSON.stringify(map);
  } catch {
    return undefined;
  }
}

export function metadataGet<T = unknown>(source: unknown, key: string): T | undefined {
  const m = parseMetadata(source);
  if (!(key in m)) return undefined;
  return m[key] as T;
}
