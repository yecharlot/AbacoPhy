import type { MasterRepository } from '../repositories/MasterRepository';

/** Palabra exacta que exige el backend para confirmar el reinicio de fábrica. */
export const RESET_CONFIRMATION = 'REINICIAR';

export class ResetPlatform {
  constructor(private readonly repo: MasterRepository) {}

  execute(confirm: string): Promise<string> {
    if (confirm.trim() !== RESET_CONFIRMATION) {
      return Promise.reject(new Error(`Escriba ${RESET_CONFIRMATION} para confirmar el reinicio`));
    }
    return this.repo.resetPlatform(RESET_CONFIRMATION);
  }
}
