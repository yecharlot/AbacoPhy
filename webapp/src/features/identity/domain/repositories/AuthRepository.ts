import type { ChangePasswordInput, LoginCredentials, Session } from '../entities/Session';

/**
 * Domain contract — identity never depends on HTTP or storage details.
 */
export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<Session>;
  logout(): Promise<void>;
  /** Restore session from token (GET /auth/me) or fail */
  getMe(): Promise<Session>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  /** Local token only — no network */
  getStoredToken(): string | null;
  clearStoredToken(): void;
}
