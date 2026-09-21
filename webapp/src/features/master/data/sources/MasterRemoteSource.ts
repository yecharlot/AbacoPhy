import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  CreateTenantResponseDto,
  ModulesResponseDto,
  ResetResponseDto,
  TenantsResponseDto,
  UpdateModulesResponseDto,
  UserResponseDto,
  UsersResponseDto,
} from '../dto/MasterDto';

export class MasterRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getTenants(): Promise<TenantsResponseDto> {
    return this.http.get<TenantsResponseDto>('/master/tenants');
  }

  createTenant(body: Record<string, unknown>): Promise<CreateTenantResponseDto> {
    return this.http.post<CreateTenantResponseDto>('/master/tenants/create', body);
  }

  reset(body: Record<string, unknown>): Promise<ResetResponseDto> {
    return this.http.post<ResetResponseDto>('/master/reset', body);
  }

  getModules(): Promise<ModulesResponseDto> {
    return this.http.get<ModulesResponseDto>('/modules');
  }

  updateModules(body: Record<string, unknown>): Promise<UpdateModulesResponseDto> {
    return this.http.put<UpdateModulesResponseDto>('/modules', body);
  }

  getUsers(): Promise<UsersResponseDto> {
    return this.http.get<UsersResponseDto>('/users');
  }

  createUser(body: Record<string, unknown>): Promise<UserResponseDto> {
    return this.http.post<UserResponseDto>('/users', body);
  }

  updateUser(body: Record<string, unknown>): Promise<UserResponseDto> {
    return this.http.put<UserResponseDto>('/users', body);
  }

  deleteUser(id: string): Promise<void> {
    return this.http.delete<void>(`/users?id=${encodeURIComponent(id)}`);
  }
}
