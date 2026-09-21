import type { ModuleMeta } from '../../domain/entities/ModuleMeta';
import type {
  CreateUserInput,
  PlatformUser,
  UpdateUserInput,
} from '../../domain/entities/PlatformUser';
import type { CreateTenantInput, TenantSummary } from '../../domain/entities/TenantSummary';
import type {
  CreateTenant,
  CreateUser,
  DeactivateUser,
  GetModules,
  ListTenants,
  ListUsers,
  ResetPlatform,
  UpdateModules,
  UpdateUser,
} from '../../domain/usecases';

export type MasterStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type MasterState = {
  status: MasterStatus;
  tenants: TenantSummary[];
  modules: Record<string, boolean>;
  moduleCatalog: ModuleMeta[];
  role: string;
  users: PlatformUser[];
  roles: string[];
  notice: string | null;
  error: string | null;
  saving: boolean;
};

type Deps = {
  listTenants: ListTenants;
  createTenant: CreateTenant;
  resetPlatform: ResetPlatform;
  getModules: GetModules;
  updateModules: UpdateModules;
  listUsers: ListUsers;
  createUser: CreateUser;
  updateUser: UpdateUser;
  deactivateUser: DeactivateUser;
};

export function createMasterStore(deps: Deps) {
  let state: MasterState = {
    status: 'idle',
    tenants: [],
    modules: {},
    moduleCatalog: [],
    role: '',
    users: [],
    roles: [],
    notice: null,
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: MasterState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<MasterState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }

  return {
    subscribe(fn: (s: MasterState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): MasterState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [modules, tenants, usersSnapshot] = await Promise.all([
          deps.getModules.execute(),
          deps.listTenants.execute().catch(() => [] as TenantSummary[]),
          deps.listUsers
            .execute()
            .catch(() => ({ users: [] as PlatformUser[], roles: [] as string[] })),
        ]);
        set({
          status: 'success',
          modules: modules.enabled,
          moduleCatalog: modules.catalog,
          role: modules.role,
          tenants,
          users: usersSnapshot.users,
          roles: usersSnapshot.roles,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar la configuración') });
      }
    },
    async addTenant(input: CreateTenantInput): Promise<void> {
      set({ saving: true, error: null, notice: null });
      try {
        const tenant = await deps.createTenant.execute(input);
        set({ saving: false, notice: `Negocio «${tenant.name}» creado` });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al crear el negocio') });
        throw err;
      }
    },
    async reset(confirm: string): Promise<void> {
      set({ saving: true, error: null, notice: null });
      try {
        const message = await deps.resetPlatform.execute(confirm);
        set({ saving: false, notice: message });
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al reiniciar la aplicación') });
        throw err;
      }
    },
    async toggleModule(id: string, enabled: boolean): Promise<void> {
      set({ saving: true, error: null, notice: null });
      try {
        const modules = await deps.updateModules.execute({ [id]: enabled });
        set({ saving: false, modules });
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al actualizar los módulos') });
        throw err;
      }
    },
    async addUser(input: CreateUserInput): Promise<void> {
      set({ saving: true, error: null, notice: null });
      try {
        await deps.createUser.execute(input);
        set({ saving: false, notice: 'Usuario creado' });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al crear el usuario') });
        throw err;
      }
    },
    async editUser(input: UpdateUserInput): Promise<void> {
      set({ saving: true, error: null, notice: null });
      try {
        await deps.updateUser.execute(input);
        set({ saving: false, notice: 'Usuario actualizado' });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al modificar el usuario') });
        throw err;
      }
    },
    async removeUser(id: string): Promise<void> {
      set({ saving: true, error: null, notice: null });
      try {
        await deps.deactivateUser.execute(id);
        set({ saving: false, notice: 'Usuario dado de baja' });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al dar de baja el usuario') });
        throw err;
      }
    },
  };
}

export type MasterStore = ReturnType<typeof createMasterStore>;
