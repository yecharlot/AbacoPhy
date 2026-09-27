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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;
  /** Alias legacy de description conservado para pantallas y datos existentes. */
  concept?: string;
  accountName?: string;
  category?: string;
  tags?: string[];

};

export type CreateEntryInput = {
  type: 'income' | 'expense';
  accountId: string;
  amount: number;
  description: string;
  concept?: string;
  counterpart?: string;
  date?: string;
  currency?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
