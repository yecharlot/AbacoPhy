import type { CostSheet } from '../entities/CostSheet';
import type { CostingRepository } from '../repositories/CostingRepository';

export class ListCostSheets {
  constructor(private readonly repo: CostingRepository) {}

  execute(): Promise<CostSheet[]> {
    return this.repo.getCostSheets();
  }
}
