import type { HttpClient } from '../../../../infrastructure/data/http';
import type { TenantResponseDto } from '../dto/TenantDto';

export class TenantRemoteSource {
  constructor(private readonly http: HttpClient) {}

  get(): Promise<TenantResponseDto> {
    return this.http.get<TenantResponseDto>('/tenant');
  }

  update(body: Record<string, unknown>): Promise<TenantResponseDto> {
    return this.http.put<TenantResponseDto>('/tenant', body);
  }
}
