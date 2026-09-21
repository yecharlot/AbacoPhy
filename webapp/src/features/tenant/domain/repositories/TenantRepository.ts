import type { Tenant, UpdateTenantInput } from '../entities/Tenant';

export interface TenantRepository {
  get(): Promise<Tenant>;
  update(input: UpdateTenantInput): Promise<Tenant>;
}
