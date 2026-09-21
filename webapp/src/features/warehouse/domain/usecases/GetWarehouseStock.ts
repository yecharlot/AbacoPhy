import type { WarehouseSnapshot } from '../entities/Stock';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class GetWarehouseStock {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(): Promise<WarehouseSnapshot> {
    return this.repo.getStock();
  }
}
