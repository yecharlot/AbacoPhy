import type { CreateTenantInput, TenantSummary } from '../entities/TenantSummary';
import type { MasterRepository } from '../repositories/MasterRepository';

export class CreateTenant {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: CreateTenantInput): Promise<TenantSummary> {
    const name = input.name.trim();
    if (!name) {
      return Promise.reject(new Error('El nombre del negocio es obligatorio'));
    }
    if (input.adminPass !== undefined && input.adminPass.length > 0 && input.adminPass.length < 6) {
      return Promise.reject(new Error('La contraseña del administrador debe tener al menos 6 caracteres'));
    }
    return this.repo.createTenant({ ...input, name });
  }
}
