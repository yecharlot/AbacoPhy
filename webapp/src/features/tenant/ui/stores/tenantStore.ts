import type { Tenant, UpdateTenantInput } from '../../domain/entities/Tenant';
import type { GetTenant } from '../../domain/usecases/GetTenant';
import type { UpdateTenant } from '../../domain/usecases/UpdateTenant';

export type TenantStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type TenantState = {
  status: TenantStatus;
  tenant: Tenant | null;
  error: string | null;
  saving: boolean;
};

type Deps = {
  getTenant: GetTenant;
  updateTenant: UpdateTenant;
};

export function createTenantStore(deps: Deps) {
  let state: TenantState = {
    status: 'idle',
    tenant: null,
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: TenantState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<TenantState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: TenantState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): TenantState {
      return state;
    },
    async load(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const tenant = await deps.getTenant.execute();
        set({
          status: tenant.name ? 'success' : 'empty',
          tenant,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar el negocio';
        set({ status: 'error', error: message, tenant: null });
      }
    },
    async save(input: UpdateTenantInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        const tenant = await deps.updateTenant.execute(input);
        set({ status: 'success', tenant, saving: false, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al guardar';
        set({ saving: false, error: message });
        throw err;
      }
    },
  };
}

export type TenantStore = ReturnType<typeof createTenantStore>;
