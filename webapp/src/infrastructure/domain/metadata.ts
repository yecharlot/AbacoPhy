/**
 * Fachada de dominio/infra para metadata.
 * Implementación real: infrastructure/data/metadata (validación de formato JSON).
 *
 * Los mappers pueden seguir importando desde aquí:
 *   import { normalizeMetadataField, metadataToDto } from '.../infrastructure/domain/metadata'
 */
export {
  isJsonSyntaxValid,
  assertJsonSyntax,
  readMetadata,
  readMetadataDetailed,
  writeMetadata,
  writeMetadataSafe,
  normalizeMetadataField,
  metadataToDto,
  parseMetadata,
  stringifyMetadata,
  metadataGet,
  metadataSet,
  type MetaMap,
  type MetadataWriteResult,
  type MetadataReadResult,
} from '../data/metadata';
