import type { AuditRepository } from '../repositories/AuditRepository';

export class ImportBackup {
  constructor(private readonly repo: AuditRepository) {}

  execute(file: File): Promise<{ ok: boolean; rev: number; rootCid: string; contentSha: string }> {
    if (!file || file.size === 0) {
      return Promise.reject(new Error('Seleccione un archivo ZIP o JSON de salva'));
    }
    return this.repo.importBackup(file);
  }
}
