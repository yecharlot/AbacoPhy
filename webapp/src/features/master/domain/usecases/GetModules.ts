import type { ModulesSnapshot } from '../entities/ModuleMeta';
import type { MasterRepository } from '../repositories/MasterRepository';

export class GetModules {
  constructor(private readonly repo: MasterRepository) {}

  execute(): Promise<ModulesSnapshot> {
    return this.repo.getModules();
  }
}
