import type { ModuleMeta } from '../../domain/entities/ModuleMeta';
import type {
  CreateUserInput,
  PlatformUser,
  UpdateUserInput,
} from '../../domain/entities/PlatformUser';
import type { CreateTenantInput, TenantSummary } from '../../domain/entities/TenantSummary';
import type { ModuleMetaDto, TenantDto, UserDto } from '../dto/MasterDto';

export function tenantDtoToEntity(dto: TenantDto): TenantSummary {
  return {
    id: dto.id,
    slug: dto.slug || '',
    name: dto.name || '',
    currency: dto.currency || '',
    active: dto.active !== false,
    createdAt: dto.created_at || '',
  };
}

export function createTenantInputToDto(input: CreateTenantInput): Record<string, unknown> {
  const body: Record<string, unknown> = { name: input.name };
  if (input.slug) body.slug = input.slug;
  if (input.currency) body.currency = input.currency;
  if (input.adminUser) body.admin_user = input.adminUser;
  if (input.adminPass) body.admin_pass = input.adminPass;
  return body;
}

export function moduleMetaDtoToEntity(dto: ModuleMetaDto): ModuleMeta {
  return {
    id: dto.id,
    name: dto.name || dto.id,
    description: dto.description || '',
    core: dto.core === true,
    group: dto.group || '',
  };
}

export function userDtoToEntity(dto: UserDto): PlatformUser {
  return {
    id: dto.id,
    username: dto.username || '',
    displayName: dto.display_name || dto.username || '',
    role: dto.role || '',
    active: dto.active !== false,
    modules: dto.modules || {},
  };
}

export function createUserInputToDto(input: CreateUserInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    username: input.username,
    password: input.password,
    role: input.role,
  };
  if (input.displayName) body.display_name = input.displayName;
  return body;
}

export function updateUserInputToDto(input: UpdateUserInput): Record<string, unknown> {
  const body: Record<string, unknown> = { id: input.id };
  if (input.displayName !== undefined) body.display_name = input.displayName;
  if (input.role !== undefined) body.role = input.role;
  if (input.password) body.password = input.password;
  if (input.active !== undefined) body.active = input.active;
  if (input.modules !== undefined) body.modules = input.modules;
  return body;
}
