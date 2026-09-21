import type { PriceSheet, SavePriceSheetInput } from '../entities/PriceSheet';
import type { CostingRepository } from '../repositories/CostingRepository';

export class SavePriceSheet {
  constructor(private readonly repo: CostingRepository) {}

  execute(input: SavePriceSheetInput): Promise<PriceSheet> {
    if (!input.productId) {
      return Promise.reject(new Error('Seleccione el producto de la ficha'));
    }
    if (input.price !== undefined && input.price < 0) {
      return Promise.reject(new Error('El precio no puede ser negativo'));
    }
    if (input.costRef !== undefined && input.costRef < 0) {
      return Promise.reject(new Error('El costo de referencia no puede ser negativo'));
    }
    if (input.marginPct !== undefined && input.marginPct < 0) {
      return Promise.reject(new Error('El margen no puede ser negativo'));
    }
    if (input.price === undefined && input.costRef === undefined) {
      return Promise.reject(new Error('Indique el precio o un costo de referencia con margen'));
    }
    return this.repo.savePriceSheet(input);
  }
}
