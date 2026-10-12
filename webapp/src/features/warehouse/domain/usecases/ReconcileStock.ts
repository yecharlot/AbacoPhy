import type { StockDiscrepancy } from '../entities/Kardex';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class ReconcileStock {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(): Promise<StockDiscrepancy[]> {
    return this.repo.reconcileStock();
  }
}
