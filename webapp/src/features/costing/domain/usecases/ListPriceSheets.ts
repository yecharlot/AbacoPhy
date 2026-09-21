import type { PriceSheet } from '../entities/PriceSheet';
import type { CostingRepository } from '../repositories/CostingRepository';

export class ListPriceSheets {
  constructor(private readonly repo: CostingRepository) {}

  execute(): Promise<PriceSheet[]> {
    return this.repo.getPriceSheets();
  }
}
