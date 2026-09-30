import type { PlatformUser, UpdateUserInput } from '../entities/PlatformUser';
import type { MasterRepository } from '../repositories/MasterRepository';
import { isAssignableRole, normalizeRole } from '../entities/roles';

export class UpdateUser {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: UpdateUserInput): Promise<PlatformUser> {
    if (!input.id) {
      return Promise.reject(new Error('Usuario no válido'));
    }
    if (input.password !== undefined && input.password.length > 0 && input.password.length < 6) {
      return Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres'));
    }
    let role = input.role;
    if (role !== undefined && role !== '') {
      role = normalizeRole(role);
      if (!isAssignableRole(role)) {
        return Promise.reject(new Error(`Rol no permitido: «${input.role}»`));
      }
    }
    return this.repo.updateUser({ ...input, role });
  }
}
