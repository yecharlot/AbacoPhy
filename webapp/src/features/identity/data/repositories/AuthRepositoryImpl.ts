import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { KeyValueStorage } from '../../../../infrastructure/data/storage';
import { StorageKeys } from '../../../../infrastructure/data/storage';
import type {
  ChangePasswordInput,
  LoginCredentials,
  Session,
} from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { loginResponseToSession, meResponseToSession } from '../mappers/authMapper';
import { AuthRemoteSource } from '../sources/AuthRemoteSource';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class AuthRepositoryImpl implements AuthRepository {
  private readonly remote: AuthRemoteSource;

  constructor(
    http: HttpClient,
    private readonly storage: KeyValueStorage,
  ) {
    this.remote = new AuthRemoteSource(http);
  }

  async login(credentials: LoginCredentials): Promise<Session> {
    try {
      const dto = await this.remote.login({
        username: credentials.username,
        password: credentials.password,
      });
      const session = loginResponseToSession(dto);
      this.storage.set(StorageKeys.authToken, session.token);
      return session;
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async logout(): Promise<void> {
    try {
      await this.remote.logout();
    } catch {
      /* still clear local token */
    }
  }

  async getMe(): Promise<Session> {
    const token = this.getStoredToken();
    if (!token) throw new Error('Sin sesión');
    try {
      const dto = await this.remote.me();
      return meResponseToSession(dto, token);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    try {
      await this.remote.changePassword({
        current_password: input.currentPassword,
        new_password: input.newPassword,
        username: input.username,
      });
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  getStoredToken(): string | null {
    return this.storage.get(StorageKeys.authToken);
  }

  clearStoredToken(): void {
    this.storage.remove(StorageKeys.authToken);
  }
}
