import type { AuditEvent } from '../entities/AuditEvent';
import type { AuditRepository } from '../repositories/AuditRepository';

export class ListSystemErrors {
  constructor(private readonly repo: AuditRepository) {}

  execute(): Promise<AuditEvent[]> {
    return this.repo.getSystemErrors();
  }
}
