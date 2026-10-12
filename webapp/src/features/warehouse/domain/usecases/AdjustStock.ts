import type { AdjustStockInput } from '../entities/Kardex';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class AdjustStock {
  constructor(private readonly repo: WarehouseRepository) {}

  async execute(input: AdjustStockInput): Promise<{ storedQty: number; ledgerQty: number }> {
    const note = (input.note || '').trim();
    if (!note) throw new Error('Indique el motivo del ajuste');
    if (!input.productId) throw new Error('Producto requerido');
    if (!input.deltaQty || input.deltaQty === 0) throw new Error('La cantidad de ajuste no puede ser cero');
    return this.repo.adjustStock({
      ...input,
      note,
      location: input.location || 'warehouse',
    });
  }
}
