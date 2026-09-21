import type { HttpClient } from '../../../../infrastructure/data/http';
import type { ModulesSnapshot } from '../../domain/entities/ModuleMeta';
import type {
  CreateUserInput,
  PlatformUser,
  UpdateUserInput,
  UsersSnapshot,
} from '../../domain/entities/PlatformUser';
import type { CreateTenantInput, TenantSummary } from '../../domain/entities/TenantSummary';
import type { MasterRepository } from '../../domain/repositories/MasterRepository';
import {
  createTenantInputToDto,
  createUserInputToDto,
  moduleMetaDtoToEntity,
  tenantDtoToEntity,
  updateUserInputToDto,
  userDtoToEntity,
} from '../mappers/masterMapper';
import { MasterRemoteSource } from '../sources/MasterRemoteSource';

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export class MasterRepositoryImpl implements MasterRepository {
  private readonly remote: MasterRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new MasterRemoteSource(http);
  }

  async getTenants(): Promise<TenantSummary[]> {
    try {
      const dto = await this.remote.getTenants();
      return (dto.tenants || []).map(tenantDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar los negocios'));
    }
  }

  async createTenant(input: CreateTenantInput): Promise<TenantSummary> {
    try {
      const dto = await this.remote.createTenant(createTenantInputToDto(input));
      if (!dto.tenant) throw new Error('Respuesta de negocio vacía');
      return tenantDtoToEntity(dto.tenant);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo crear el negocio'));
    }
  }

  async resetPlatform(confirm: string): Promise<string> {
    try {
      const dto = await this.remote.reset({ confirm });
      return dto.message || 'Aplicación restaurada a estado inicial';
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo reiniciar la aplicación'));
    }
  }

  async getModules(): Promise<ModulesSnapshot> {
    try {
      const dto = await this.remote.getModules();
      return {
        enabled: dto.modules || {},
        catalog: (dto.catalog || []).map(moduleMetaDtoToEntity),
        role: dto.role || '',
      };
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar los módulos'));
    }
  }

  async updateModules(modules: Record<string, boolean>): Promise<Record<string, boolean>> {
    try {
      const dto = await this.remote.updateModules({ modules });
      return dto.modules || modules;
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron actualizar los módulos'));
    }
  }

  async getUsers(): Promise<UsersSnapshot> {
    try {
      const dto = await this.remote.getUsers();
      return {
        users: (dto.users || []).map(userDtoToEntity),
        roles: dto.roles || [],
      };
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar los usuarios'));
    }
  }

  async createUser(input: CreateUserInput): Promise<PlatformUser> {
    try {
      const dto = await this.remote.createUser(createUserInputToDto(input));
      if (!dto.user) throw new Error('Respuesta de usuario vacía');
      return userDtoToEntity(dto.user);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo crear el usuario'));
    }
  }

  async updateUser(input: UpdateUserInput): Promise<PlatformUser> {
    try {
      const dto = await this.remote.updateUser(updateUserInputToDto(input));
      if (!dto.user) throw new Error('Respuesta de usuario vacía');
      return userDtoToEntity(dto.user);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo modificar el usuario'));
    }
  }

  async deactivateUser(id: string): Promise<void> {
    try {
      await this.remote.deleteUser(id);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo dar de baja el usuario'));
    }
  }
}
