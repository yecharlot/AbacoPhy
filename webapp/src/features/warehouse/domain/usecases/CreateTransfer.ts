import type { CreateTransferInput, Transfer } from '../entities/Transfer';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class CreateTransfer {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(input: CreateTransferInput): Promise<Transfer> {
    if (!input.unitId) {
      return Promise.reject(new Error('Seleccione la unidad de venta destino'));
    }
    if (input.lines.length === 0) {
      return Promise.reject(new Error('La transferencia necesita al menos una línea'));
    }
    for (const line of input.lines) {
      if (!line.productId) {
        return Promise.reject(new Error('Cada línea necesita un producto'));
      }
      if (line.qty <= 0) {
        return Promise.reject(new Error('La cantidad debe ser mayor que cero'));
      }
    }
    return this.repo.createTransfer(input);
  }
}
