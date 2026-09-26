export type JournalEntry = {
  id: string;
  date: string;
  description: string;
  /** Cuenta al debe (id o nombre legible). */
  debitAccount: string;
  /** Cuenta al haber (id o nombre legible). */
  creditAccount: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'adjustment' | string;
  currency?: string;
  accountId?: string;
  counterpartId?: string;
};
