import type { EnterReceptionInput, Reception } from '../entities/Reception';
import { RECEPTION_ABANDON_MARKER } from '../entities/Reception';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class EnterReception {
  constructor(private readonly repo: WarehouseRepository) {}

  async execute(input: EnterReceptionInput): Promise<Reception> {
    const id = (input.id || '').trim();
    if (!id) {
      throw new Error('Indique el informe de recepción');
    }

    if (input.abandon) {
      const reason = (input.reason || '').trim();
      if (!reason) {
        throw new Error('Indique el motivo del abandono definitivo');
      }
      const tagged = reason.includes(RECEPTION_ABANDON_MARKER)
        ? reason
        : `${RECEPTION_ABANDON_MARKER} ${reason}`;
      return this.repo.enterReception({
        id,
        accept: false,
        reason: tagged,
        note: input.note?.trim() || undefined,
      });
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
