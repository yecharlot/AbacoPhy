import type { CreateSalesUnitInput, SalesUnit } from '../entities/SalesUnit';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class CreateSalesUnit {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(input: CreateSalesUnitInput): Promise<SalesUnit> {
    const name = input.name.trim();
    if (!name) {
      return Promise.reject(new Error('El nombre de la unidad es obligatorio'));
    }
    return this.repo.createSalesUnit({ ...input, name });
  }
}
