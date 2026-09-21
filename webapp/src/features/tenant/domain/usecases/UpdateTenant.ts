import type { Tenant, UpdateTenantInput } from '../entities/Tenant';
import type { TenantRepository } from '../repositories/TenantRepository';

export class UpdateTenant {
  constructor(private readonly repo: TenantRepository) {}

  async execute(input: UpdateTenantInput): Promise<Tenant> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('El nombre del negocio no puede estar vacío');
    }
    if (input.currency !== undefined && input.currency.trim().length < 3) {
      throw new Error('Moneda inválida (ej. CUP, USD)');
    }
    return this.repo.update({
      ...input,
      name: input.name?.trim(),
      currency: input.currency?.trim().toUpperCase(),
      phone: input.phone?.trim(),
      address: input.address?.trim(),
      email: input.email?.trim(),
      taxId: input.taxId?.trim(),
    });
  }
}
