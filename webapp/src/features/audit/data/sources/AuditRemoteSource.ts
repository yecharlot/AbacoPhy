import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  AuditResponseDto,
  BackupMetaDto,
  BackupsResponseDto,
  ErrorsResponseDto,
} from '../dto/AuditDto';

export class AuditRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getAudit(): Promise<AuditResponseDto> {
    return this.http.get<AuditResponseDto>('/audit');
  }

  getBackups(): Promise<BackupsResponseDto> {
    return this.http.get<BackupsResponseDto>('/backups');
  }

  createBackup(body: Record<string, unknown>): Promise<BackupMetaDto> {
    return this.http.post<BackupMetaDto>('/backups', body);
  }

  restoreBackup(body: Record<string, unknown>): Promise<{ ok?: boolean }> {
    return this.http.post<{ ok?: boolean }>('/backups/restore', body);
  }

  exportBackup(): Promise<Blob> {
    return this.http.getBlob('/backups/export');
  }

  getErrors(): Promise<ErrorsResponseDto> {
    return this.http.get<ErrorsResponseDto>('/errors');
  }
}
