import type { LoginCredentials, Session } from '../entities/Session';
import type { AuthRepository } from '../repositories/AuthRepository';

export class Login {
  constructor(private readonly auth: AuthRepository) {}

  async execute(credentials: LoginCredentials): Promise<Session> {
    const username = credentials.username.trim();
    const password = credentials.password;
    if (!username || !password) {
      throw new Error('Usuario y contraseña son obligatorios');
    }
    return this.auth.login({ username, password });
  }
}
