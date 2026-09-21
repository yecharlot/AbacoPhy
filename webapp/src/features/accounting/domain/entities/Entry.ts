export interface Entry {
  id: string;
  date: string;
  concept: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  amount: number;
  currency: string;
  accountId: string;
  accountName?: string;
  category?: string;
  tags?: string[];
}
