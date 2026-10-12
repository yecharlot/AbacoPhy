import type { HttpClient } from '../../../../infrastructure/data/http';
import type { SyncGetResponseDto, SyncPushRequestDto, SyncPushResponseDto } from '../dto/SyncDto';

export class SyncRemoteSource {
  constructor(private readonly http: HttpClient) {}

  pull(sinceRev?: number): Promise<SyncGetResponseDto> {
    const q =
      sinceRev !== undefined && sinceRev !== null && Number.isFinite(sinceRev)
        ? `?since_rev=${encodeURIComponent(String(sinceRev))}`
        : '';
    return this.http.get<SyncGetResponseDto>(`/sync${q}`);
  }

  push(body: SyncPushRequestDto): Promise<SyncPushResponseDto> {
    return this.http.post<SyncPushResponseDto>('/sync/push', body);
  }
}
