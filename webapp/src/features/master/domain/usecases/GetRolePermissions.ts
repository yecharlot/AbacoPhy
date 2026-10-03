import type { MasterRepository, RolePermissions } from '../repositories/MasterRepository';

export class GetRolePermissions {
  constructor(private readonly repo: MasterRepository) {}

  execute(): Promise<RolePermissions> {
    return this.repo.getRolePermissions();
  }
}
