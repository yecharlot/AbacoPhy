import type { EnterReceptionInput, Reception } from '../entities/Reception';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

/** Almacenero: validar con económico y dar entrada física al almacén. */
export class EnterReception {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(input: EnterReceptionInput): Promise<Reception> {
    if (!input.id) {
      return Promise.reject(new Error('Informe requerido'));
    }
    if (!input.accept) {
      return Promise.reject(new Error('Debe confirmar la validación con el económico'));
    }
    return this.repo.enterReception(input);
  }
}
