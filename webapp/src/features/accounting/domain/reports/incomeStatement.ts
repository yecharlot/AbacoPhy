import type { Account } from '../entities/Account';
import type { Entry } from '../entities/Entry';
import type { Equation } from '../entities/Equation';

export type IncomeStatementLine = {
  id: string;
  code: string;
  name: string;
  amount: number;
};

export type IncomeStatement = {
  incomeLines: IncomeStatementLine[];
  expenseLines: IncomeStatementLine[];
  totalIncome: number;
  totalExpenses: number;
  /** Ingresos − Gastos (positivo = utilidad). */
  netResult: number;
  /** Origen de los totales. */
  source: 'accounts' | 'summary' | 'entries';
  periodLabel: string;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function inPeriod(date: string, from?: string, to?: string): boolean {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function mergeLines(lines: IncomeStatementLine[]): IncomeStatementLine[] {
  const map = new Map<string, IncomeStatementLine>();
  for (const l of lines) {
    const prev = map.get(l.id);
    if (prev) prev.amount += l.amount;
    else map.set(l.id, { ...l });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
}

function formatPeriodLabel(from?: string, to?: string): string {
  if (!from && !to) return 'Todo el historial';
  if (from && to) return `${from} → ${to}`;
  if (from) return `Desde ${from}`;
  return `Hasta ${to}`;
}

function linesFromAccounts(accounts: Account[], type: 'income' | 'expense'): IncomeStatementLine[] {
  return accounts
    .filter((a) => a.type === type)
    .map((a) => ({
      id: a.id,
      code: a.code || '—',
      name: a.name || a.id,
      amount: Math.abs(n(a.balance)),
    }))
    .filter((l) => l.amount > 0)
    .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
}

function linesFromEntries(
  entries: Entry[],
  accounts: Account[],
  type: 'income' | 'expense',
): IncomeStatementLine[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const lines: IncomeStatementLine[] = [];
  for (const e of entries) {
    if (e.type !== type) continue;
    const acc = byId.get(e.accountId);
    const any = e as Entry & { concept?: string };
    lines.push({
      id: e.accountId || e.id,
      code: acc?.code || '—',
      name: acc?.name || any.description || any.concept || e.accountId || e.id,
      amount: Math.abs(n(e.amount)),
    });
  }
  return mergeLines(lines);
}

/**
 * Estado de resultados (Pérdidas y Ganancias).
 *
 * - Sin filtro de fechas: saldos de cuentas income/expense (coherente con ecuación).
 *   Si no hay saldos, usa summary del backend.
 * - Con filtro de fechas: suma asientos income/expense del periodo.
 */
export function buildIncomeStatement(opts: {
  accounts: Account[];
  summary?: Equation | null;
  entries?: Entry[];
  from?: string;
  to?: string;
}): IncomeStatement {
  const { accounts, summary, entries = [], from, to } = opts;
  const hasPeriod = Boolean(from || to);
  const periodLabel = formatPeriodLabel(from, to);

  if (hasPeriod) {
    const filtered = entries.filter((e) => inPeriod(e.date || '', from, to));
    const incomeLines = linesFromEntries(filtered, accounts, 'income');
    const expenseLines = linesFromEntries(filtered, accounts, 'expense');
    const totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0);
    const totalExpenses = expenseLines.reduce((s, l) => s + l.amount, 0);
    return {
      incomeLines,
      expenseLines,
      totalIncome,
      totalExpenses,
      netResult: totalIncome - totalExpenses,
      source: 'entries',
      periodLabel,
    };
  }

  let incomeLines = linesFromAccounts(accounts, 'income');
  let expenseLines = linesFromAccounts(accounts, 'expense');
  let totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0);
  let totalExpenses = expenseLines.reduce((s, l) => s + l.amount, 0);
  let source: IncomeStatement['source'] = 'accounts';

  if (totalIncome === 0 && totalExpenses === 0 && summary) {
    totalIncome = n(summary.income);
    totalExpenses = n(summary.expenses);
    source = 'summary';
    if (totalIncome > 0) {
      incomeLines = [{ id: 'summary-income', code: '—', name: 'Ingresos (resumen)', amount: totalIncome }];
    }
    if (totalExpenses > 0) {
      expenseLines = [{ id: 'summary-expense', code: '—', name: 'Gastos (resumen)', amount: totalExpenses }];
    }
  }

  const netFromSummary =
    source === 'summary' && summary && Math.abs(n(summary.netProfit)) > 0.0001
      ? n(summary.netProfit)
      : totalIncome - totalExpenses;

  return {
    incomeLines,
    expenseLines,
    totalIncome,
    totalExpenses,
    netResult: netFromSummary,
    source,
    periodLabel,
  };
}
