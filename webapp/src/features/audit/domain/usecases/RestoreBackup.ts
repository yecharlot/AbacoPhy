import type { AuditRepository } from '../repositories/AuditRepository';

export class RestoreBackup {
  constructor(private readonly repo: AuditRepository) {}

  execute(cid: string): Promise<void> {
    if (!cid.trim()) {
      return Promise.reject(new Error('Indique el CID de la salva a restaurar'));
    }
    return this.repo.restoreBackup(cid.trim());
  }
}
