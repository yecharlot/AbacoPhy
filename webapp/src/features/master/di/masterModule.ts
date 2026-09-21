import type { AppContainer } from '../../../infrastructure/di';
import { MasterRepositoryImpl } from '../data/repositories/MasterRepositoryImpl';
import {
  CreateTenant,
  CreateUser,
  DeactivateUser,
  GetModules,
  ListTenants,
  ListUsers,
  ResetPlatform,
  UpdateModules,
  UpdateUser,
} from '../domain/usecases';
import { createMasterStore, type MasterStore } from '../ui/stores/masterStore';

export type MasterModule = {
  masterStore: MasterStore;
};

export function createMasterModule(container: AppContainer): MasterModule {
  const repo = new MasterRepositoryImpl(container.http);

  const masterStore = createMasterStore({
    listTenants: new ListTenants(repo),
    createTenant: new CreateTenant(repo),
    resetPlatform: new ResetPlatform(repo),
    getModules: new GetModules(repo),
    updateModules: new UpdateModules(repo),
    listUsers: new ListUsers(repo),
    createUser: new CreateUser(repo),
    updateUser: new UpdateUser(repo),
    deactivateUser: new DeactivateUser(repo),
  });

  return { masterStore };
}
