import type { CreateReceptionInput, Reception } from '../entities/Reception';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

/**
 * Validación de formulario únicamente: el promedio ponderado y la partida doble
 * los resuelve el backend Go.
 */
export class CreateReception {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(input: CreateReceptionInput): Promise<Reception> {
    if (input.lines.length === 0) {
      return Promise.reject(new Error('La recepción necesita al menos una línea'));
    }
    for (const line of input.lines) {
      if (!line.productId) {
        return Promise.reject(new Error('Cada línea necesita un producto'));
      }
      if (line.qty <= 0) {
        return Promise.reject(new Error('La cantidad debe ser mayor que cero'));
      }
      if (line.unitCost < 0) {
        return Promise.reject(new Error('El costo unitario no puede ser negativo'));
      }
    }
    return this.repo.createReception(input);
  }
}
