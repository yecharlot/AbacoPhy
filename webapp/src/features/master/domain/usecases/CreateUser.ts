import type { CreateUserInput, PlatformUser } from '../entities/PlatformUser';
import type { MasterRepository } from '../repositories/MasterRepository';
import { isAssignableRole, normalizeRole } from '../entities/roles';

export class CreateUser {
  constructor(private readonly repo: MasterRepository) {}

  execute(input: CreateUserInput): Promise<PlatformUser> {
    const username = input.username.trim();
    if (!username) {
      return Promise.reject(new Error('El nombre de usuario es obligatorio'));
    }
    if (input.password.length < 6) {
      return Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres'));
    }
    const role = normalizeRole(input.role || '');
    if (!role) {
      return Promise.reject(new Error('Seleccione un rol'));
    }
    if (!isAssignableRole(role)) {
      return Promise.reject(
        new Error(`Rol no permitido: «${input.role}». Elija uno de la lista.`),
      );
    }
    return this.repo.createUser({
      ...input,
      username,
      role,
    });
  }
}
