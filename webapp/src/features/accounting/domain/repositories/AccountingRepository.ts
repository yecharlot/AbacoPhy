import type { Account } from '../entities/Account';
import type { Entry } from '../entities/Entry';
import type { Equation } from '../entities/Equation';
import type { JournalEntry } from '../entities/JournalEntry';
import type { TrialBalance } from '../entities/TrialBalance';

export type EntriesQuery = {
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export interface AccountingRepository {
  getAccounts(): Promise<Account[]>;
  getEntries(params?: EntriesQuery): Promise<Entry[]>;
  getSummary(): Promise<Equation>;
  createEntry(entry: Omit<Entry, 'id'>): Promise<Entry>;
  /** Libro diario desde GET /entries (filtros fase 5–6). */
  getJournal(params?: EntriesQuery): Promise<JournalEntry[]>;
  /** Balance de comprobación desde GET /reports/trial-balance (fase 6). */
  getTrialBalance(): Promise<TrialBalance>;
}
