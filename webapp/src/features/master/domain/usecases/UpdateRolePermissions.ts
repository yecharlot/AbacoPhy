import type { MasterRepository } from '../repositories/MasterRepository';

export class UpdateRolePermissions {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: { role: string; permissions: Record<string, boolean> }): Promise<Record<string, boolean>> {
    if (!input.role) {
      return Promise.reject(new Error('Rol no válido'));
    }
    return this.repo.updateRolePermissions(input.role, input.permissions);
  }
}
