import type { AuditRepository } from '../repositories/AuditRepository';

/** Devuelve el ZIP de la salva; la descarga al disco es responsabilidad de la UI. */
export class ExportBackup {
  constructor(private readonly repo: AuditRepository) {}

  execute(): Promise<Blob> {
    return this.repo.exportBackup();
  }
}
