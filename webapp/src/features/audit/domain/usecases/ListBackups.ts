import type { BackupsSnapshot } from '../entities/Backup';
import type { AuditRepository } from '../repositories/AuditRepository';

export class ListBackups {
  constructor(private readonly repo: AuditRepository) {}

  execute(): Promise<BackupsSnapshot> {
    return this.repo.getBackups();
  }
}
