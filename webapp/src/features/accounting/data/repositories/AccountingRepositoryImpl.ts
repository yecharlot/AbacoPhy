import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';
import type { JournalEntry } from '../../domain/entities/JournalEntry';
import type { TrialBalance } from '../../domain/entities/TrialBalance';
import type {
  AccountingRepository,
  EntriesQuery,
} from '../../domain/repositories/AccountingRepository';
import { AccountingRemoteSource } from '../sources/AccountingRemoteSource';
import { accountingMapper, reportsMapper } from '../mappers/accountingMapper';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class AccountingRepositoryImpl implements AccountingRepository {
  private readonly remote: AccountingRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new AccountingRemoteSource(http);
  }

  async getAccounts(): Promise<Account[]> {
    try {
      const res = await this.remote.getAccounts();
      return (res.accounts || []).map(accountingMapper.toAccount);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getEntries(params?: EntriesQuery): Promise<Entry[]> {
    try {
      const res = await this.remote.getEntries(params);
      return (res.entries || []).map(accountingMapper.toEntry);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  /**
   * Trial balance solo vía API fase 6.
   * Sin fallback local duplicado (una fuente de verdad).
   */
  async getTrialBalance(): Promise<TrialBalance> {
    try {
      const dto = await this.remote.getTrialBalance();
      return reportsMapper.toTrialBalance(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  /**
   * Diario = GET /entries mapeado a JournalEntry.
   * Params type/from/to/limit llegan al backend (fases 5–6).
   */
  async getJournal(params?: EntriesQuery): Promise<JournalEntry[]> {
    try {
      const res = await this.remote.getJournal(params);
      return (res.entries || []).map(reportsMapper.entryToJournal);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getSummary(): Promise<Equation> {
    try {
      const dto = await this.remote.getSummary();
      return accountingMapper.toEquation(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createEntry(entry: Omit<Entry, 'id'>): Promise<Entry> {
    try {
      const dto = await this.remote.createEntry(accountingMapper.toEntryDto(entry));
      return accountingMapper.toEntry(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
