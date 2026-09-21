import type { AuthRepository } from '../repositories/AuthRepository';

export class Logout {
  constructor(private readonly auth: AuthRepository) {}

  async execute(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      this.auth.clearStoredToken();
    }
  }
}
