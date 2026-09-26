/**
 * Codec de metadata — solo validación de FORMATO JSON (sintaxis).
 * No valida claves ni tipos de negocio (eso es de cada feature / use case).
 *
 * Lectura: tolerante (JSON inválido → vacío, la UI no rompe).
 * Escritura: estricta en string de entrada (debe ser JSON bien formado)
 *            o serialización segura desde objeto.
 */

export type MetaMap = Record<string, unknown>;

export type MetadataWriteOk = { ok: true; value: string | undefined };
export type MetadataWriteErr = { ok: false; error: string };
export type MetadataWriteResult = MetadataWriteOk | MetadataWriteErr;

export type MetadataReadOk = { ok: true; map: MetaMap; raw: string | undefined };
export type MetadataReadErr = { ok: false; error: string; map: MetaMap };
export type MetadataReadResult = MetadataReadOk | MetadataReadErr;

/** Extrae el valor crudo de metadata desde un DTO/entidad o el valor directo. */
function extractRaw(source: unknown): unknown {
  if (
    source != null &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    'metadata' in (source as object)
  ) {
    return (source as { metadata?: unknown }).metadata;
  }
  return source;
}

/**
 * Comprueba que el string tenga sintaxis JSON válida
 * (llaves, corchetes, comas, listas, anidación).
 * No inspecciona el significado del contenido.
 */
export function isJsonSyntaxValid(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true; // vacío = sin metadata
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/**
 * Igual que isJsonSyntaxValid pero lanza si el formato es inválido.
 * Usar en pipelines de escritura cuando se recibe un string del usuario/API.
 */
export function assertJsonSyntax(raw: string): void {
  const t = raw.trim();
  if (!t) return;
  try {
    JSON.parse(t);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'sintaxis inválida';
    throw new Error(`metadata: JSON con formato inválido (${detail})`);
  }
}

/**
 * Lectura tolerante para mappers / UI.
 * - Ausente / null / "" → map {}
 * - String con JSON inválido → map {} (no lanza)
 * - String con JSON válido objeto → MetaMap
 * - String con JSON válido no-objeto (array/primitive) → map {}
 *   (el bag de entidad es objeto; arrays no se promueven a bag)
 * - Objeto plano → copia superficial
 */
export function readMetadata(source: unknown): MetaMap {
  const result = readMetadataDetailed(source);
  return result.map;
}

/** Lectura con detalle (ok / error de formato) sin lanzar. */
export function readMetadataDetailed(source: unknown): MetadataReadResult {
  const raw = extractRaw(source);

  if (raw == null || raw === '') {
    return { ok: true, map: {}, raw: undefined };
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ok: true, map: { ...(raw as MetaMap) }, raw: undefined };
  }

  if (typeof raw !== 'string') {
    return { ok: false, error: 'metadata: tipo no soportado (se espera string u objeto)', map: {} };
  }

  const t = raw.trim();
  if (!t || t === 'null') {
    return { ok: true, map: {}, raw: undefined };
  }

  try {
    const parsed: unknown = JSON.parse(t);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ok: true, map: parsed as MetaMap, raw: t };
    }
    // JSON válido pero no es bag de objeto (array/número/string)
    return { ok: true, map: {}, raw: t };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'sintaxis inválida';
    return { ok: false, error: `metadata: JSON con formato inválido (${detail})`, map: {} };
  }
}

/**
 * Escritura desde valor arbitrario → string JSON listo para API/persistencia.
 *
 * - null / undefined / "" → undefined (omitir campo)
 * - string → debe pasar assertJsonSyntax; "" → undefined
 * - object / array → JSON.stringify (siempre sintaxis válida)
 * - resto → error
 *
 * Lanza si el string de entrada tiene formato inválido.
 */
export function writeMetadata(value: unknown): string | undefined {
  const result = writeMetadataSafe(value);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

/**
 * Escritura sin lanzar: resultado discriminado ok | error.
 * Ideal para formularios / stores que muestran el mensaje al usuario.
 */
export function writeMetadataSafe(value: unknown): MetadataWriteResult {
  if (value == null || value === '') {
    return { ok: true, value: undefined };
  }

  if (typeof value === 'string') {
    const t = value.trim();
    if (!t || t === 'null') {
      return { ok: true, value: undefined };
    }
    try {
      JSON.parse(t); // solo formato
      return { ok: true, value: t };
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'sintaxis inválida';
      return { ok: false, error: `metadata: JSON con formato inválido (${detail})` };
    }
  }

  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      if (s === '{}' || s === '[]') {
        return { ok: true, value: undefined };
      }
      return { ok: true, value: s };
    } catch {
      return { ok: false, error: 'metadata: no se pudo serializar a JSON' };
    }
  }

  return { ok: false, error: 'metadata: tipo no serializable (use string u objeto)' };
}

/**
 * Normaliza a string canónico para campo entity.metadata / DTO.
 * Lectura tolerante (nunca lanza). Equivalente seguro para mappers.
 */
export function normalizeMetadataField(source: unknown): string | undefined {
  const detailed = readMetadataDetailed(source);
  if (!detailed.ok) {
    return undefined;
  }
  if (detailed.raw) {
    // re-stringify del map si queremos canónico; conservamos raw válido de objeto
    const keys = Object.keys(detailed.map);
    if (keys.length === 0 && detailed.raw) {
      // JSON válido no-objeto (array) — no lo persistimos como bag
      return undefined;
    }
    if (keys.length === 0) return undefined;
    try {
      return JSON.stringify(detailed.map);
    } catch {
      return detailed.raw;
    }
  }
  const keys = Object.keys(detailed.map);
  if (keys.length === 0) return undefined;
  try {
    return JSON.stringify(detailed.map);
  } catch {
    return undefined;
  }
}

/**
 * Para mappers de escritura (entity/input → DTO).
 * Toma entity.metadata o el valor directo; formato inválido → undefined (no lanza en mapper).
 * Para fallar en UI usar writeMetadata / writeMetadataSafe.
 */
export function metadataToDto(source: unknown): string | undefined {
  const raw = extractRaw(source);
  const r = writeMetadataSafe(raw);
  return r.ok ? r.value : undefined;
}

export function parseMetadata(raw: unknown): MetaMap {
  return readMetadata(raw);
}

export function stringifyMetadata(map: MetaMap | null | undefined): string | undefined {
  if (!map || Object.keys(map).length === 0) return undefined;
  const r = writeMetadataSafe(map);
  return r.ok ? r.value : undefined;
}

export function metadataGet<T = unknown>(source: unknown, key: string): T | undefined {
  const m = readMetadata(source);
  if (!(key in m)) return undefined;
  return m[key] as T;
}

export function metadataSet(source: unknown, key: string, value: unknown): string | undefined {
  const m = { ...readMetadata(source) };
  if (value === undefined) delete m[key];
  else m[key] = value;
  return stringifyMetadata(m);
}
