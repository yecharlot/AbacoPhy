import type { MasterRepository } from '../repositories/MasterRepository';

export class UpdateModules {
  constructor(private readonly repo: MasterRepository) {}

  execute(modules: Record<string, boolean>): Promise<Record<string, boolean>> {
    if (Object.keys(modules).length === 0) {
      return Promise.reject(new Error('No hay módulos que actualizar'));
    }
    return this.repo.updateModules(modules);
  }
}
