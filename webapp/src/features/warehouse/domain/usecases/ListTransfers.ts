import type { Transfer } from '../entities/Transfer';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class ListTransfers {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(): Promise<Transfer[]> {
    return this.repo.getTransfers();
  }
}
