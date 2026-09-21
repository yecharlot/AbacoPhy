import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  AccountsResponseDto,
  CreateEntryRequestDto,
  CreateEntryResponseDto,
  EntriesResponseDto,
  SummaryResponseDto,
} from '../dto/AccountingDto';

export class AccountingRemoteSource {
  constructor(private readonly http: HttpClient) {}

  listAccounts(): Promise<AccountsResponseDto> {
    return this.http.get<AccountsResponseDto>('/accounts');
  }

  listEntries(): Promise<EntriesResponseDto> {
    return this.http.get<EntriesResponseDto>('/entries');
  }

  createEntry(body: CreateEntryRequestDto): Promise<CreateEntryResponseDto> {
    return this.http.post<CreateEntryResponseDto>('/entries', body);
  }

  getSummary(): Promise<SummaryResponseDto> {
    return this.http.get<SummaryResponseDto>('/reports/summary');
  }
}
