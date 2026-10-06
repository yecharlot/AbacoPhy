import type { CostingRepository } from '../repositories/CostingRepository';

/**
 * Elimina ficha de costo.
 * Política: el backend rechaza (409) si el producto es componente de otras recetas.
 */
export class DeleteCostSheet {
  constructor(private readonly repo: CostingRepository) {}

  execute(productId: string): Promise<void> {
    if (!productId?.trim()) {
      return Promise.reject(new Error('productId requerido'));
    }
    return this.repo.deleteCostSheet(productId.trim());
  }
}
