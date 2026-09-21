import type { CostSheet, SaveCostSheetInput } from '../entities/CostSheet';
import type { CostingRepository } from '../repositories/CostingRepository';

/** Solo validación de formulario: la suma de elementos de costo la hace el backend. */
export class SaveCostSheet {
  constructor(private readonly repo: CostingRepository) {}

  execute(input: SaveCostSheetInput): Promise<CostSheet> {
    if (!input.productId) {
      return Promise.reject(new Error('Seleccione el producto de la ficha'));
    }
    const amounts: Array<number | undefined> = [
      input.materiaPrima,
      input.materialesAuxiliares,
      input.energia,
      input.salarioDirecto,
      input.otrosDirectos,
      input.gastosIndirectos,
      input.precioSugerido,
    ];
    if (amounts.some((value) => value !== undefined && value < 0)) {
      return Promise.reject(new Error('Los importes de la ficha no pueden ser negativos'));
    }
    return this.repo.saveCostSheet(input);
  }
}
