import type { ChangePasswordInput } from '../entities/Session';
import type { AuthRepository } from '../repositories/AuthRepository';

export class ChangePassword {
  constructor(private readonly auth: AuthRepository) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    if (!input.currentPassword || !input.newPassword) {
      throw new Error('Contraseña actual y nueva son obligatorias');
    }
    if (input.newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }
    await this.auth.changePassword(input);
  }
}
