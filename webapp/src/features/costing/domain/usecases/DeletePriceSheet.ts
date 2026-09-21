import type { CostingRepository } from '../repositories/CostingRepository';

export class DeletePriceSheet {
  constructor(private readonly repo: CostingRepository) {}

  execute(id: string): Promise<void> {
    if (!id) {
      return Promise.reject(new Error('Ficha de precio no válida'));
    }
    return this.repo.deletePriceSheet(id);
  }
}
