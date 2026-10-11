import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  AuditQueryParams,
  AuditResponseDto,
  BackupMetaDto,
  BackupsResponseDto,
  ErrorsResponseDto,
  RestoreBackupResponseDto,
} from '../dto/AuditDto';

const LOG = '[Abaco.Salvas]';

function toQuery(params?: AuditQueryParams): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

function base64ToBlob(b64: string, mime: string): Blob {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/zip' });
}

export class AuditRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getAudit(params?: AuditQueryParams): Promise<AuditResponseDto> {
    return this.http.get<AuditResponseDto>(`/audit${toQuery(params)}`);
  }

  getBackups(): Promise<BackupsResponseDto> {
    return this.http.get<BackupsResponseDto>('/backups');
  }

  createBackup(body: Record<string, unknown>): Promise<BackupMetaDto> {
    return this.http.post<BackupMetaDto>('/backups', body);
  }

  restoreBackup(body: Record<string, unknown>): Promise<RestoreBackupResponseDto> {
    return this.http.post<RestoreBackupResponseDto>('/backups/restore', body);
  }

  /**
   * SOLO canal JSON (mismo que login/listados).
   * Nunca usa getBlob: el ZIP binario cross-origin falla en Firefox
   * ("No se ha conseguido recuperar" / Failed to fetch).
   */
  async exportBackup(): Promise<Blob> {
    type ExportDto = {
      ok?: boolean;
      filename?: string;
      content_type?: string;
      size?: number;
      data_base64?: string;
      error?: string;
    };

    const base =
      typeof (this.http as { baseUrl?: string }).baseUrl === 'string'
        ? (this.http as { baseUrl: string }).baseUrl
        : '(unknown)';

    console.info(`${LOG} exportBackup START (JSON only)`, {
      baseUrl: base,
      path: '/backups/export',
      note: 'backend default = base64 JSON; no getBlob',
      origin: typeof location !== 'undefined' ? location.origin : 'n/a',
    });

    // Sin query: backend ya responde JSON+base64 por defecto.
    // También aceptamos ?as=base64 por compatibilidad.
    const dto = await this.http.get<ExportDto>('/backups/export?as=base64');

    console.info(`${LOG} exportBackup response`, {
      ok: dto?.ok,
      size: dto?.size,
      hasData: Boolean(dto?.data_base64),
      dataLen: dto?.data_base64?.length ?? 0,
      filename: dto?.filename,
      error: dto?.error,
      keys: dto && typeof dto === 'object' ? Object.keys(dto) : [],
    });

    if (!dto || typeof dto !== 'object') {
      throw new Error(
        'Respuesta de export inválida (no es JSON). ¿Backend reiniciado con el parche de export?',
      );
    }
    if (dto.error && !dto.data_base64) {
      throw new Error(String(dto.error));
    }
    if (!dto.data_base64) {
      throw new Error(
        'El servidor no envió data_base64. Reinicie el backend con el parche de salvas (export JSON).',
      );
    }

    let blob: Blob;
    try {
      blob = base64ToBlob(dto.data_base64, dto.content_type || 'application/zip');
    } catch (decodeErr) {
      console.error(`${LOG} base64 decode failed`, decodeErr);
      throw new Error(
        `No se pudo decodificar data_base64: ${decodeErr instanceof Error ? decodeErr.message : String(decodeErr)}`,
      );
    }

    console.info(`${LOG} exportBackup blob OK`, { blobSize: blob.size, type: blob.type });
    if (!blob.size) throw new Error('ZIP vacío tras decodificar base64');
    return blob;
  }

  importBackup(file: File): Promise<RestoreBackupResponseDto> {
    console.info(`${LOG} importBackup`, { name: file.name, size: file.size, type: file.type });
    const form = new FormData();
    form.append('file', file, file.name || 'abacophy-salva.zip');
    if (typeof (this.http as { postForm?: unknown }).postForm !== 'function') {
      throw new Error('HttpClient.postForm no disponible — aplique el parche de httpClient');
    }
    return this.http.postForm<RestoreBackupResponseDto>('/backups/import', form);
  }

  getErrors(): Promise<ErrorsResponseDto> {
    return this.http.get<ErrorsResponseDto>('/errors');
  }
}
