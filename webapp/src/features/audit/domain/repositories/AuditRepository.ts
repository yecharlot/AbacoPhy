import type { AuditEvent, AuditTrail } from '../entities/AuditEvent';
import type { BackupMeta, BackupsSnapshot } from '../entities/Backup';

export interface AuditRepository {
  getTrail(): Promise<AuditTrail>;
  getBackups(): Promise<BackupsSnapshot>;
  createBackup(label: string): Promise<BackupMeta>;
  restoreBackup(cid: string): Promise<void>;
  exportBackup(): Promise<Blob>;
  /** Solo rol master. */
  getSystemErrors(): Promise<AuditEvent[]>;
}
