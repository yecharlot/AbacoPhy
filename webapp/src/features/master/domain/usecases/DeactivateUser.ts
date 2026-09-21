import type { MasterRepository } from '../repositories/MasterRepository';

export class DeactivateUser {
  constructor(private readonly repo: MasterRepository) {}

  execute(id: string): Promise<void> {
    if (!id) {
      return Promise.reject(new Error('Usuario no válido'));
    }
    return this.repo.deactivateUser(id);
  }
}
