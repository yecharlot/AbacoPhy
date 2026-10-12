export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  currency?: string;
  balance: number;
  /** Si el API lo envía; cuentas inactivas se omiten en reportes. */
  active?: boolean;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;
};
