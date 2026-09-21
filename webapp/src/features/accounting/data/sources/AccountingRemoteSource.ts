import type { HttpClient } from '../../../../infrastructure/data/http';
import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';

export class AccountingRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getAccounts(): Promise<{ accounts: AccountDto[] }> {
    return this.http.get<{ accounts: AccountDto[] }>('/accounts');
  }

  getEntries(params?: { type?: string; limit?: number }): Promise<{ entries: EntryDto[] }> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.limit) query.append('limit', params.limit.toString());
    const path = `/entries${query.toString() ? `?${query.toString()}` : ''}`;
    return this.http.get<{ entries: EntryDto[] }>(path);
  }

  getSummary(): Promise<SummaryDto> {
    return this.http.get<SummaryDto>('/reports/summary');
  }

  createEntry(body: Partial<EntryDto>): Promise<EntryDto> {
    return this.http.post<EntryDto>('/entries', body);
  }
}
