/** Formas de API para /master/*, /modules y /users. */

export type TenantDto = {
  id: string;
  slug?: string;
  name?: string;
  currency?: string;
  active?: boolean;
  created_at?: string;
};

export type TenantsResponseDto = {
  tenants?: TenantDto[] | null;
};

export type CreateTenantResponseDto = {
  tenant?: TenantDto;
  admin_user?: string;
};

export type ResetResponseDto = {
  ok?: boolean;
  message?: string;
};

export type ModuleMetaDto = {
  id: string;
  name?: string;
  description?: string;
  core?: boolean;
  group?: string;
};

export type ModulesResponseDto = {
  modules?: Record<string, boolean> | null;
  catalog?: ModuleMetaDto[] | null;
  role?: string;
};

export type UpdateModulesResponseDto = {
  ok?: boolean;
  modules?: Record<string, boolean> | null;
};

export type UserDto = {
  id: string;
  username?: string;
  display_name?: string;
  role?: string;
  tenant_id?: string;
  active?: boolean;
  modules?: Record<string, boolean> | null;
};

export type UsersResponseDto = {
  users?: UserDto[] | null;
  roles?: string[] | null;
};

export type UserResponseDto = {
  user?: UserDto;
  views?: string[] | null;
};
