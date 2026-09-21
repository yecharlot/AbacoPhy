import type { AuditTrail } from '../entities/AuditEvent';
import type { AuditRepository } from '../repositories/AuditRepository';

export class ListAuditTrail {
  constructor(private readonly repo: AuditRepository) {}

  execute(): Promise<AuditTrail> {
    return this.repo.getTrail();
  }
}
