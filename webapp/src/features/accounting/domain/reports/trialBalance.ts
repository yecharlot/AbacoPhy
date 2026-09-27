import type { Account, AccountType } from '../entities/Account';

/** Naturaleza normal del saldo (partida doble). */
export function isDebitNature(type: AccountType): boolean {
  return type === 'asset' || type === 'expense';
}

export type TrialBalanceRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  /** Saldo contable tal cual viene del plan. */
  balance: number;
  /** Importe en columna Debe (≥ 0). */
  debit: number;
  /** Importe en columna Haber (≥ 0). */
  credit: number;
};

export type TrialBalance = {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  /** |Debe − Haber| < epsilon → cuadrado. */
  balanced: boolean;
  difference: number;
};

const EPS = 0.005;

/**
 * Balance de comprobación a partir del plan de cuentas.
 * El saldo se coloca en Debe o Haber según la naturaleza de la cuenta.
 * Si el saldo es negativo, se muestra en el lado contrario (compensación).
 */
export function buildTrialBalance(accounts: Account[]): TrialBalance {
  const sorted = [...accounts].sort((a, b) =>
    (a.code || a.name).localeCompare(b.code || b.name, 'es', { numeric: true }),
  );

  const rows: TrialBalanceRow[] = sorted.map((a) => {
    const bal = Number.isFinite(a.balance) ? a.balance : 0;
    const debitNature = isDebitNature(a.type);
    let debit = 0;
    let credit = 0;
    if (bal >= 0) {
      if (debitNature) debit = bal;
      else credit = bal;
    } else {
      // Saldo contrario a la naturaleza
      if (debitNature) credit = -bal;
      else debit = -bal;
    }
    return {
      id: a.id,
      code: a.code || '—',
      name: a.name || a.id,
      type: a.type,
      balance: bal,
      debit,
      credit,
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const difference = totalDebit - totalCredit;

  return {
    rows,
    totalDebit,
    totalCredit,
    balanced: Math.abs(difference) < EPS,
    difference,
  };
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: 'Activo',
  liability: 'Pasivo',
  equity: 'Patrimonio',
  income: 'Ingreso',
  expense: 'Gasto',
};
