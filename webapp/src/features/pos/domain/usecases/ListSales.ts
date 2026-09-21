import type { Sale } from '../entities/Sale';
import type { SalesRepository } from '../repositories/SalesRepository';

export class ListSales {
  constructor(private readonly repo: SalesRepository) {}

  execute(): Promise<Sale[]> {
    return this.repo.getSales();
  }
}
