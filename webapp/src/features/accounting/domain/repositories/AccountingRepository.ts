import type { Account } from '../entities/Account';
import type { Entry } from '../entities/Entry';
import type { Equation } from '../entities/Equation';

export interface AccountingRepository {
  getAccounts(): Promise<Account[]>;
  getEntries(params?: { type?: string; limit?: number }): Promise<Entry[]>;
  getSummary(): Promise<Equation>;
  createEntry(entry: Omit<Entry, 'id'>): Promise<Entry>;
}
