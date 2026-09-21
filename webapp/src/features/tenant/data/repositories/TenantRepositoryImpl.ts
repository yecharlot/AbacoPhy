import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Tenant, UpdateTenantInput } from '../../domain/entities/Tenant';
import type { TenantRepository } from '../../domain/repositories/TenantRepository';
import { tenantDtoToEntity, updateInputToDto } from '../mappers/tenantMapper';
import { TenantRemoteSource } from '../sources/TenantRemoteSource';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class TenantRepositoryImpl implements TenantRepository {
  private readonly remote: TenantRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new TenantRemoteSource(http);
  }

  async get(): Promise<Tenant> {
    try {
      const dto = await this.remote.get();
      return tenantDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async update(input: UpdateTenantInput): Promise<Tenant> {
    try {
      const dto = await this.remote.update(updateInputToDto(input));
      return tenantDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
