import type { AuditEvent } from '../../domain/entities/AuditEvent';
import type { BackupMeta } from '../../domain/entities/Backup';
import type { AuditEntryDto, BackupMetaDto } from '../dto/AuditDto';

export function auditEntryDtoToEntity(dto: AuditEntryDto): AuditEvent {
  return {
    id: dto.id,
    userId: dto.user_id || '',
    username: dto.username || '',
    action: dto.action || '',
    detail: dto.detail || '',
    ref: dto.ref || '',
    cid: dto.cid || '',
    createdAt: dto.created_at || '',
  };
}

export function backupMetaDtoToEntity(dto: BackupMetaDto): BackupMeta {
  return {
    cid: dto.cid || '',
    label: dto.label || '',
    rev: dto.rev || 0,
    userId: dto.user_id || '',
    username: dto.username || '',
    createdAt: dto.created_at || '',
  };
}
