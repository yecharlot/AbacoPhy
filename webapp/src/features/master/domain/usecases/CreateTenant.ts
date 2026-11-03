import type { CreateTenantInput, TenantSummary } from '../entities/TenantSummary';
import type { MasterRepository } from '../repositories/MasterRepository';

export class CreateTenant {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: CreateTenantInput): Promise<TenantSummary> {
    const name = input.name.trim();
    if (!name) {
      return Promise.reject(new Error('El nombre del negocio es obligatorio'));
    }
    return this.repo.createTenant({ ...input, name });
  }
}
