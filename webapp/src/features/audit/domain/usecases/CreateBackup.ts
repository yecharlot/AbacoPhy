import type { BackupMeta } from '../entities/Backup';
import type { AuditRepository } from '../repositories/AuditRepository';

export class CreateBackup {
  constructor(private readonly repo: AuditRepository) {}

  execute(label: string): Promise<BackupMeta> {
    return this.repo.createBackup(label.trim());
  }
}
