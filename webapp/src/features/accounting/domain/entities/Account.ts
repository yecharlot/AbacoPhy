export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
};
