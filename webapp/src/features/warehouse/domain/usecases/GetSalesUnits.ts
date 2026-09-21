import type { SalesUnitsSnapshot } from '../entities/SalesUnit';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class GetSalesUnits {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(): Promise<SalesUnitsSnapshot> {
    return this.repo.getSalesUnits();
  }
}
