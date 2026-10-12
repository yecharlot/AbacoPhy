import type { AuditEvent, AuditListQuery, AuditTrail } from '../entities/AuditEvent';
import type { BackupMeta, BackupsSnapshot } from '../entities/Backup';

export interface AuditRepository {
  getTrail(query?: AuditListQuery): Promise<AuditTrail>;
  getBackups(): Promise<BackupsSnapshot>;
  createBackup(label: string): Promise<BackupMeta>;
  restoreBackup(cid: string): Promise<void>;
  exportBackup(): Promise<Blob>;
  /** Restaura desde un archivo ZIP exportado (disco). */
  importBackup(file: File): Promise<void>;
  /** Solo rol master. */
  getSystemErrors(): Promise<AuditEvent[]>;
}
