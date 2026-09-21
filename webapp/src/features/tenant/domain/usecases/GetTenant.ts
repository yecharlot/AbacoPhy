import type { Tenant } from '../entities/Tenant';
import type { TenantRepository } from '../repositories/TenantRepository';

export class GetTenant {
  constructor(private readonly repo: TenantRepository) {}

  execute(): Promise<Tenant> {
    return this.repo.get();
  }
}
