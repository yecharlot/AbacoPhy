import type { HttpClient } from '../../../../infrastructure/data/http';
import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type { TrialBalanceDto } from '../dto/TrialBalanceDto';

type CreateEntryResponse = {
  asiento?: EntryDto;
  entry?: EntryDto;
} & Partial<EntryDto>;

/** Params alineados con GET /api/v1/entries (backend fases 5–6). */
export type EntriesQuery = {
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export class AccountingRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getAccounts(): Promise<{ accounts: AccountDto[] }> {
    return this.http.get<{ accounts: AccountDto[] }>('/accounts');
  }

  getEntries(params?: EntriesQuery): Promise<{ entries: EntryDto[]; rev?: number; root_cid?: string }> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.limit != null && params.limit > 0) query.append('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get<{ entries: EntryDto[]; rev?: number; root_cid?: string }>(
      `/entries${qs ? `?${qs}` : ''}`,
    );
  }

  getSummary(): Promise<SummaryDto> {
    return this.http.get<SummaryDto>('/reports/summary');
  }

  /** Backend fase 6: GET /api/v1/reports/trial-balance */
  getTrialBalance(): Promise<TrialBalanceDto> {
    return this.http.get<TrialBalanceDto>('/reports/trial-balance');
  }

  /**
   * Libro diario = mismo endpoint /entries (fases 5–6).
   * No existe /reports/journal; no inventar ruta.
   */
  getJournal(params?: EntriesQuery): Promise<{ entries: EntryDto[]; rev?: number; root_cid?: string }> {
    return this.getEntries(params);
  }

  async createEntry(body: Record<string, unknown>): Promise<EntryDto> {
    const res = await this.http.post<CreateEntryResponse>('/entries', body);
    const entry = res.asiento ?? res.entry ?? (res as EntryDto);
    if (!entry || !entry.id) {
      return {
        id: (entry as EntryDto)?.id ?? '',
        date: String(body.date ?? ''),
        type: String(body.type ?? ''),
        amount: Number(body.amount ?? 0),
        currency: String(body.currency ?? ''),
        account_id: String(body.account_id ?? ''),
        description: String(body.description ?? ''),
        concept: String(body.description ?? ''),
      };
    }
    return entry;
  }
}
