import type { AppContainer } from '../../../infrastructure/di';
import { AuthRepositoryImpl } from '../data/repositories/AuthRepositoryImpl';
import { ChangePassword, GetMe, Login, Logout } from '../domain/usecases';
import { createSessionStore, type SessionStore } from '../ui/stores/sessionStore';

export type IdentityModule = {
  sessionStore: SessionStore;
};

/**
 * Manual DI for identity feature.
 * Only place that knows AuthRepositoryImpl.
 */
export function createIdentityModule(container: AppContainer): IdentityModule {
  const repo = new AuthRepositoryImpl(container.http, container.storage);

  const login = new Login(repo);
  const logout = new Logout(repo);
  const getMe = new GetMe(repo);
  const changePassword = new ChangePassword(repo);

  const sessionStore = createSessionStore({
    login,
    logout,
    getMe,
    changePassword,
  });

  return { sessionStore };
}
