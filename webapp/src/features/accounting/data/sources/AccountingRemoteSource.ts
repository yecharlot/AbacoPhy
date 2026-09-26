import type { HttpClient } from '../../../../infrastructure/data/http';
import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type {TrialBalanceDto} from "../dto/TrialBalanceDto";
import type {JournalEntryDto} from "../dto/JournalEntryDto";

type CreateEntryResponse = {
  asiento?: EntryDto;
  entry?: EntryDto;
} & Partial<EntryDto>;

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

  getTrialBalance(): Promise<TrialBalanceDto> {
    return this.http.get<TrialBalanceDto>('/reports/trial-balance');
  }

  getJournal(params?: { limit?: number }): Promise<{ entries: JournalEntryDto[] }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    const path = `/entries${query.toString() ? `?${query.toString()}` : ''}`;
    return this.http.get<{ entries: JournalEntryDto[] }>(path);
  }

  async createEntry(body: Record<string, unknown>): Promise<EntryDto> {
    const res = await this.http.post<CreateEntryResponse>('/entries', body);
    // Go responde { asiento, ecuacion, rev, root_cid }
    const entry = res.asiento ?? res.entry ?? (res as EntryDto);
    if (!entry || !entry.id) {
      // Si el servidor solo devolvió ok parcial, sintetizar lo enviado
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
