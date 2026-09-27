import type { EnterReceptionInput, Reception } from '../entities/Reception';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

/**
 * Confirma la entrada física de un informe de recepción pendiente.
 * Backend: POST /receptions/enter { id, accept: true }.
 * Efecto: llena WarehouseStock; no vuelve a mover Caja/Inventarios contables.
 */
export class EnterReception {
  constructor(private readonly repo: WarehouseRepository) {}

  async execute(input: EnterReceptionInput): Promise<Reception> {
    const id = (input.id || '').trim();
    if (!id) {
      throw new Error('Indique el informe de recepción a entrar');
    }
    if (!input.accept && !(input.reason || '').trim()) {
      throw new Error('Indique el motivo del problema de entrada');
    }
    return this.repo.enterReception({
      id,
      accept: input.accept,
      note: input.note?.trim() || undefined,
      reason: input.accept ? undefined : input.reason?.trim(),
    });
  }
}
