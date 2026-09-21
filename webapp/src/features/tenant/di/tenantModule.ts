import type { AppContainer } from '../../../infrastructure/di';
import { TenantRepositoryImpl } from '../data/repositories/TenantRepositoryImpl';
import { GetTenant, UpdateTenant } from '../domain/usecases';
import { createTenantStore, type TenantStore } from '../ui/stores/tenantStore';

export type TenantModule = {
  tenantStore: TenantStore;
};

export function createTenantModule(container: AppContainer): TenantModule {
  const repo = new TenantRepositoryImpl(container.http);
  const getTenant = new GetTenant(repo);
  const updateTenant = new UpdateTenant(repo);
  const tenantStore = createTenantStore({ getTenant, updateTenant });
  return { tenantStore };
}
