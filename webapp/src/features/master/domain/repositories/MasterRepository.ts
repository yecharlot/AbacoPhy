import type { CreateTenantInput, TenantSummary } from '../entities/TenantSummary';
import type { ModulesSnapshot } from '../entities/ModuleMeta';
import type {
  CreateUserInput,
  PlatformUser,
  UpdateUserInput,
  UsersSnapshot,
} from '../entities/PlatformUser';

export type RolePermissions = Record<string, Record<string, boolean>>;

export interface MasterRepository {
  getTenants(): Promise<TenantSummary[]>;
  createTenant(input: CreateTenantInput): Promise<TenantSummary>;
  resetPlatform(confirm: string): Promise<string>;
  getModules(): Promise<ModulesSnapshot>;
  updateModules(modules: Record<string, boolean>): Promise<Record<string, boolean>>;
  getUsers(): Promise<UsersSnapshot>;
  getRolePermissions(): Promise<RolePermissions>;
  updateRolePermissions(role: string, permissions: Record<string, boolean>): Promise<Record<string, boolean>>;
  createUser(input: CreateUserInput): Promise<PlatformUser>;
  updateUser(input: UpdateUserInput): Promise<PlatformUser>;
  deactivateUser(id: string): Promise<void>;
}
