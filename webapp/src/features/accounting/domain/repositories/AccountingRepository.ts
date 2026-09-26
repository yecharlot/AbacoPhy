import type { Account } from '../entities/Account';
import type { Entry } from '../entities/Entry';
import type { Equation } from '../entities/Equation';
import type {JournalEntry} from "../entities/JournalEntry";
import type {TrialBalance} from "../entities/TrialBalance";

export interface AccountingRepository {
  getAccounts(): Promise<Account[]>;
  getEntries(params?: { type?: string; from?: string; to?: string; limit?: number }): Promise<Entry[]>;
  getSummary(): Promise<Equation>;
  createEntry(entry: Omit<Entry, 'id'>): Promise<Entry>;
  getJournal(params?: { limit?: number }): Promise<JournalEntry[]>;
  getTrialBalance(): Promise<TrialBalance>;
}
