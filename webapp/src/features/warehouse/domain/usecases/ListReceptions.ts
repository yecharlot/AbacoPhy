import type { Reception } from '../entities/Reception';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class ListReceptions {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(): Promise<Reception[]> {
    return this.repo.getReceptions();
  }
}
