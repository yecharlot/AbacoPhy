import type { TenantSummary } from '../entities/TenantSummary';
import type { MasterRepository } from '../repositories/MasterRepository';

export class ListTenants {
  constructor(private readonly repo: MasterRepository) {}

  execute(): Promise<TenantSummary[]> {
    return this.repo.getTenants();
  }
}
