import { downloadCsv } from '../../../../infrastructure/data/export/csv';
import {
  openPrintWindow,
  tableHtml,
  type ReportMeta,
} from '../../../../infrastructure/data/export/printHtml';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { IncomeStatement } from '../../domain/reports';
import type { JournalBook } from '../../domain/reports';
import type { TrialBalance } from '../../domain/reports';
import { accountName } from '../viewmodels/entryList';

export type ExportContext = {
  businessName?: string;
  generatedBy?: string;
  generatedByRole?: string;
};

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function money(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

function baseMeta(title: string, subtitle: string | undefined, ctx?: ExportContext): ReportMeta {
  return {
    title,
    subtitle,
    businessName: ctx?.businessName,
    generatedBy: ctx?.generatedBy,
    generatedByRole: ctx?.generatedByRole,
    systemName: 'ÁbacoPhy',
  };
}

function fpFromRows(headers: string[], rows: Array<Array<string | number>>): string {
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportTrialBalanceCsv(trial: TrialBalance): void {
  downloadCsv(
    `balance_comprobacion_${stamp()}.csv`,
    ['Código', 'Nombre', 'Tipo', 'Debe', 'Haber', 'Saldo'],
    trial.rows.map((r) => [r.code, r.name, r.type, money(r.debit), money(r.credit), money(r.balance)]),
  );
}

export async function exportTrialBalancePdf(trial: TrialBalance, ctx?: ExportContext): Promise<void> {
  const headers = ['Código', 'Nombre', 'Tipo', 'Debe', 'Haber', 'Saldo'];
  const rows: Array<Array<string | number>> = trial.rows.map((r) => [
    r.code,
    r.name,
    r.type,
    money(r.debit),
    money(r.credit),
    money(r.balance),
  ]);
  rows.push(['', 'TOTALES', '', money(trial.totalDebit), money(trial.totalCredit), '']);
  const body = tableHtml(headers, rows, [3, 4, 5]);
  await openPrintWindow(
    baseMeta(
      'Balance de comprobación',
      trial.balanced ? 'Cuadrado (Debe = Haber)' : `Descuadre ${money(trial.difference)}`,
      ctx,
    ),
    body,
    fpFromRows(headers, rows),
  );
}

export function exportIncomeStatementCsv(statement: IncomeStatement): void {
  const rows: Array<Array<unknown>> = [];
  for (const l of statement.incomeLines) {
    rows.push(['Ingreso', l.code, l.name, money(l.amount)]);
  }
  rows.push(['', '', 'Total ingresos', money(statement.totalIncome)]);
  for (const l of statement.expenseLines) {
    rows.push(['Gasto', l.code, l.name, money(l.amount)]);
  }
  rows.push(['', '', 'Total gastos', money(statement.totalExpenses)]);
  rows.push(['', '', 'Resultado neto', money(statement.netResult)]);
  downloadCsv(`estado_resultados_${stamp()}.csv`, ['Sección', 'Código', 'Nombre', 'Importe'], rows);
}

export async function exportIncomeStatementPdf(
  statement: IncomeStatement,
  ctx?: ExportContext,
): Promise<void> {
  const headers = ['Sección', 'Código', 'Nombre', 'Importe'];
  const rows: Array<Array<string | number>> = [];
  for (const l of statement.incomeLines) rows.push(['Ingreso', l.code, l.name, money(l.amount)]);
  rows.push(['', '', 'Total ingresos', money(statement.totalIncome)]);
  for (const l of statement.expenseLines) rows.push(['Gasto', l.code, l.name, money(l.amount)]);
  rows.push(['', '', 'Total gastos', money(statement.totalExpenses)]);
  rows.push(['', '', 'Resultado neto', money(statement.netResult)]);
  await openPrintWindow(
    baseMeta(
      'Estado de resultados',
      `Fuente: ${statement.source}${statement.periodLabel ? ` · ${statement.periodLabel}` : ''}`,
      ctx,
    ),
    tableHtml(headers, rows, [3]),
    fpFromRows(headers, rows),
  );
}

export function exportJournalCsv(journal: JournalBook): void {
  downloadCsv(
    `libro_diario_${stamp()}.csv`,
    ['Fecha', 'Tipo', 'Descripción', 'Cuenta', 'Importe', 'Moneda'],
    journal.rows.map((r) => [
      r.date?.slice(0, 10) || '',
      r.type,
      r.description,
      `${r.accountCode} ${r.accountName}`.trim(),
      money(r.amount),
      r.currency || '',
    ]),
  );
}

export async function exportJournalPdf(journal: JournalBook, ctx?: ExportContext): Promise<void> {
  const headers = ['Fecha', 'Tipo', 'Descripción', 'Cuenta', 'Importe', 'Moneda'];
  const rows = journal.rows.map((r) => [
    r.date?.slice(0, 10) || '',
    String(r.type),
    r.description,
    `${r.accountCode} ${r.accountName}`.trim(),
    money(r.amount),
    r.currency || '',
  ]);
  await openPrintWindow(
    baseMeta(
      'Libro diario',
      `${journal.count} asientos · Ingresos ${money(journal.totalIncome)} · Gastos ${money(journal.totalExpense)}`,
      ctx,
    ),
    tableHtml(headers, rows, [4]),
    fpFromRows(headers, rows),
  );
}

export function exportEntriesCsv(
  kind: 'income' | 'expense',
  entries: Entry[],
  accounts: Account[],
): void {
  const label = kind === 'income' ? 'ingresos' : 'gastos';
  downloadCsv(
    `${label}_${stamp()}.csv`,
    ['Fecha', 'Descripción', 'Cuenta', 'Importe', 'Moneda'],
    entries.map((e) => [
      e.date?.slice(0, 10) || '',
      e.description || e.concept || '',
      accountName(accounts, e.accountId),
      money(e.amount),
      e.currency || '',
    ]),
  );
}

export async function exportEntriesPdf(
  kind: 'income' | 'expense',
  entries: Entry[],
  accounts: Account[],
  ctx?: ExportContext,
): Promise<void> {
  const title = kind === 'income' ? 'Listado de ingresos' : 'Listado de gastos';
  const headers = ['Fecha', 'Descripción', 'Cuenta', 'Importe', 'Moneda'];
  const rows = entries.map((e) => [
    e.date?.slice(0, 10) || '',
    e.description || e.concept || '',
    accountName(accounts, e.accountId),
    money(e.amount),
    e.currency || '',
  ]);
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  await openPrintWindow(
    baseMeta(title, `${entries.length} movimientos · Total ${money(total)}`, ctx),
    tableHtml(headers, rows, [3]),
    fpFromRows(headers, rows),
  );
}

export function exportAccountsCsv(accounts: Account[]): void {
  downloadCsv(
    `plan_cuentas_${stamp()}.csv`,
    ['Código', 'Nombre', 'Tipo', 'Saldo', 'Moneda'],
    accounts.map((a) => [a.code, a.name, a.type, money(a.balance), a.currency || '']),
  );
}

export async function exportAccountsPdf(accounts: Account[], ctx?: ExportContext): Promise<void> {
  const headers = ['Código', 'Nombre', 'Tipo', 'Saldo', 'Moneda'];
  const rows = accounts.map((a) => [
    a.code,
    a.name,
    a.type,
    money(a.balance),
    a.currency || '',
  ]);
  await openPrintWindow(
    baseMeta('Plan de cuentas', `${accounts.length} cuentas`, ctx),
    tableHtml(headers, rows, [3]),
    fpFromRows(headers, rows),
  );
}
