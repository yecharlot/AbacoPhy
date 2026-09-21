import type { Account } from '../entities/Account';
import type { CreateEntryInput, Entry } from '../entities/Entry';
import type { Equation, Summary } from '../entities/Equation';

export type CreateEntryResult = {
  entry: Entry;
  equation: Equation | null;
  rev?: number;
  rootCid?: string;
};

export interface AccountingRepository {
  listAccounts(): Promise<Account[]>;
  listEntries(): Promise<Entry[]>;
  createEntry(input: CreateEntryInput): Promise<CreateEntryResult>;
  getSummary(): Promise<Summary>;
}
