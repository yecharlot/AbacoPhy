import type { PlatformUser, UpdateUserInput } from '../entities/PlatformUser';
import type { MasterRepository } from '../repositories/MasterRepository';

export class UpdateUser {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: UpdateUserInput): Promise<PlatformUser> {
    if (!input.id) {
      return Promise.reject(new Error('Usuario no válido'));
    }
    if (input.password !== undefined && input.password.length > 0 && input.password.length < 6) {
      return Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres'));
    }
    return this.repo.updateUser(input);
  }
}
