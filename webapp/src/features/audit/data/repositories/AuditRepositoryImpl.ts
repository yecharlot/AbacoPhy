import type { HttpClient } from '../../../../infrastructure/data/http';
import type { AuditEvent, AuditListQuery, AuditTrail } from '../../domain/entities/AuditEvent';
import type { BackupMeta, BackupsSnapshot } from '../../domain/entities/Backup';
import type { AuditRepository } from '../../domain/repositories/AuditRepository';
import { auditEntryDtoToEntity, backupMetaDtoToEntity } from '../mappers/auditMapper';
import { AuditRemoteSource } from '../sources/AuditRemoteSource';

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export class AuditRepositoryImpl implements AuditRepository {
  private readonly remote: AuditRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new AuditRemoteSource(http);
  }

  async getTrail(query?: AuditListQuery): Promise<AuditTrail> {
    try {
      const dto = await this.remote.getAudit(
        query
          ? {
              action: query.action,
              user_id: query.userId,
              username: query.username,
              ref: query.ref,
              q: query.q,
              since: query.since,
              until: query.until,
              limit: query.limit,
              offset: query.offset,
            }
          : undefined,
      );
      return {
        events: (dto.audit || []).map(auditEntryDtoToEntity),
        rootCid: dto.root_cid || '',
        total: dto.total ?? (dto.audit || []).length,
        limit: dto.limit ?? 0,
        offset: dto.offset ?? 0,
        actions: dto.actions || [],
      };
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo cargar la traza'));
    }
  }

  async getBackups(): Promise<BackupsSnapshot> {
    try {
      const dto = await this.remote.getBackups();
      return {
        backups: (dto.backups || []).map(backupMetaDtoToEntity),
        currentCid: dto.current_cid || '',
        rev: dto.rev || 0,
      };
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las salvas'));
    }
  }

  async createBackup(label: string): Promise<BackupMeta> {
    try {
      const dto = await this.remote.createBackup({ label });
      return backupMetaDtoToEntity(dto);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo crear la salva'));
    }
  }

  async restoreBackup(cid: string): Promise<void> {
    try {
      await this.remote.restoreBackup({ cid });
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo restaurar la salva'));
    }
  }

  async exportBackup(): Promise<Blob> {
    try {
      return await this.remote.exportBackup();
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo exportar la salva'));
    }
  }

  async getSystemErrors(): Promise<AuditEvent[]> {
    try {
      const dto = await this.remote.getErrors();
      return (dto.errors || []).map(auditEntryDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las incidencias'));
    }
  }
}
