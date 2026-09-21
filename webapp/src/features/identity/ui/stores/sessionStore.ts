import type { Session } from '../../domain/entities/Session';
import type { ChangePassword } from '../../domain/usecases/ChangePassword';
import type { GetMe } from '../../domain/usecases/GetMe';
import type { Login } from '../../domain/usecases/Login';
import type { Logout } from '../../domain/usecases/Logout';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error';

export type SessionState = {
  status: SessionStatus;
  session: Session | null;
  error: string | null;
};

type Deps = {
  login: Login;
  logout: Logout;
  getMe: GetMe;
  changePassword: ChangePassword;
};

/**
 * Visual session state — no fetch, no business rules beyond orchestrating use cases.
 */
export function createSessionStore(deps: Deps) {
  let state: SessionState = {
    status: 'idle',
    session: null,
    error: null,
  };
  const listeners = new Set<(s: SessionState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<SessionState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: SessionState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): SessionState {
      return state;
    },
    async bootstrap(): Promise<void> {
      set({ status: 'loading', error: null });
      const session = await deps.getMe.execute();
      if (session) {
        set({ status: 'authenticated', session, error: null });
      } else {
        set({ status: 'anonymous', session: null, error: null });
      }
    },
    async login(username: string, password: string): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const session = await deps.login.execute({ username, password });
        set({ status: 'authenticated', session, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
        set({ status: 'error', session: null, error: message });
        throw err;
      }
    },
    async logout(): Promise<void> {
      set({ status: 'loading', error: null });
      await deps.logout.execute();
      set({ status: 'anonymous', session: null, error: null });
    },
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      await deps.changePassword.execute({ currentPassword, newPassword });
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
