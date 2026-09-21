export type EntryType = 'income' | 'expense' | 'transfer';

export type Entry = {
  id: string;
  type: EntryType;
  accountId: string;
  amount: number;
  description: string;
  counterpart?: string;
  date: string;
  currency: string;
};

export type CreateEntryInput = {
  type: 'income' | 'expense';
  accountId: string;
  amount: number;
  description: string;
  counterpart?: string;
  date?: string;
  currency?: string;
};
