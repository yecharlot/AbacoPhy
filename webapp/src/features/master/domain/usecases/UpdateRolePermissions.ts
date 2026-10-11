import type { MasterRepository } from '../repositories/MasterRepository';

export type UpdateRolePermissionsResult = {
  permissions: Record<string, boolean>;
  sessionsRevoked: number;
};

export class UpdateRolePermissions {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: {
    role: string;
    permissions: Record<string, boolean>;
  }): Promise<UpdateRolePermissionsResult> {
    if (!input.role) {
      return Promise.reject(new Error('Rol no válido'));
    }
    return this.repo.updateRolePermissions(input.role, input.permissions);
  }
}
