import type { Session } from '../entities/Session';
import type { AuthRepository } from '../repositories/AuthRepository';

export class GetMe {
  constructor(private readonly auth: AuthRepository) {}

  /**
   * Restores session if a token exists.
   * Returns null when there is no token or the server rejects it.
   */
  async execute(): Promise<Session | null> {
    const token = this.auth.getStoredToken();
    if (!token) return null;
    try {
      return await this.auth.getMe();
    } catch {
      this.auth.clearStoredToken();
      return null;
    }
  }
}
