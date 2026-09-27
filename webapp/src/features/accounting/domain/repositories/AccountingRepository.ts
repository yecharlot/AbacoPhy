import type { Account } from '../entities/Account';
import type { CreateEntryInput, Entry } from '../entities/Entry';
import type { Equation, Summary } from '../entities/Equation';
import type { JournalEntry } from '../entities/JournalEntry';
import type { TrialBalance } from '../entities/TrialBalance';

export type EntriesQuery = {
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type CreateEntryResult = {
  entry: Entry;
  equation: Equation | null;
  rev?: number;
  rootCid?: string;
};

export interface AccountingRepository {
  listAccounts(): Promise<Account[]>;
  listEntries(params?: EntriesQuery): Promise<Entry[]>;
  createEntry(input: CreateEntryInput): Promise<CreateEntryResult>;
  getSummary(): Promise<Summary>;
  getJournal(params?: EntriesQuery): Promise<JournalEntry[]>;
  getTrialBalance(): Promise<TrialBalance>;
}
