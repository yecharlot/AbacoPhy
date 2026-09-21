import type { HttpClient } from '../../../../infrastructure/data/http';
import type { SyncGetResponseDto, SyncPushRequestDto, SyncPushResponseDto } from '../dto/SyncDto';

export class SyncRemoteSource {
  constructor(private readonly http: HttpClient) {}

  pull(): Promise<SyncGetResponseDto> {
    return this.http.get<SyncGetResponseDto>('/sync');
  }

  push(body: SyncPushRequestDto): Promise<SyncPushResponseDto> {
    return this.http.post<SyncPushResponseDto>('/sync/push', body);
  }
}
