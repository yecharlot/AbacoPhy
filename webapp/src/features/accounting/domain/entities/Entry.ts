export interface Entry {
  id: string;
  date: string;
  concept: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment' | string;
  amount: number;
  currency: string;
  accountId: string;
  accountName?: string;
  /** Contrapartida (p.ej. caja) — API `counterpart`. */
  counterpart?: string;
  category?: string;
  tags?: string[];
}
