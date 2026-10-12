import type { Account } from '../entities/Account';
import type { BalanceSheet, BalanceSheetLine } from '../entities/BalanceSheet';

function typ(t: string): string {
  const x = (t || '').toLowerCase();
  if (['asset', 'activo'].includes(x)) return 'asset';
  if (['liability', 'pasivo'].includes(x)) return 'liability';
  if (['equity', 'patrimonio'].includes(x)) return 'equity';
  return x;
}

function line(a: Account): BalanceSheetLine {
  return { id: a.id, code: a.code || '', name: a.name || '', balance: a.balance ?? 0 };
}

/** Balance general a partir del plan de cuentas (misma fuente que trial balance). */
export function buildBalanceSheet(accounts: Account[]): BalanceSheet {
  const assets: BalanceSheetLine[] = [];
  const liabilities: BalanceSheetLine[] = [];
  const equity: BalanceSheetLine[] = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let income = 0;
  let expenses = 0;

  for (const a of accounts) {
    if (a.active === false) continue;
    const k = typ(a.type);
    const bal = a.balance ?? 0;
    if (k === 'asset') {
      assets.push(line(a));
      totalAssets += bal;
    } else if (k === 'liability') {
      liabilities.push(line(a));
      totalLiabilities += bal;
    } else if (k === 'equity') {
      equity.push(line(a));
      totalEquity += bal;
    } else if (k === 'income' || k === 'ingreso' || k === 'ingresos') {
      income += bal;
    } else if (k === 'expense' || k === 'gasto' || k === 'gastos' || k === 'egreso') {
      expenses += bal;
    }
  }

  const sort = (xs: BalanceSheetLine[]) =>
    xs.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));

  return {
    assets: sort(assets),
    liabilities: sort(liabilities),
    equity: sort(equity),
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome: income - expenses,
  };
}
