/**
 * Agregaciones de presentación para el tablero.
 * Solo agrupan y formatean datos que ya vienen del backend: aquí no hay
 * partida doble, ecuación contable ni cálculo de saldos.
 */
import type { ChartPoint } from '../../../../infrastructure/ui/charts';
import { paletteColor } from '../../../../infrastructure/ui/charts';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function monthKey(date: string): string {
  return date.length >= 7 ? date.slice(0, 7) : '';
}

function monthLabel(key: string): string {
  const parts = key.split('-');
  const index = Number(parts[1]) - 1;
  return index >= 0 && index < 12 ? MONTH_LABELS[index] : key;
}

/** Serie mensual (últimos `months`) de un tipo de asiento. */
export function monthlySeries(
  entries: Entry[],
  type: Entry['type'],
  months = 6,
): ChartPoint[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    if (entry.type !== type) continue;
    const key = monthKey(entry.date);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + entry.amount);
  }

  return Array.from(totals.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-months)
    .map(([key, value]) => ({ label: monthLabel(key), value, hint: key }));
}

/** Reparto de gastos por categoría (o cuenta si no hay categoría). */
export function expenseSplit(entries: Entry[], slices = 6): ChartPoint[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    if (entry.type !== 'expense') continue;
    const key = entry.category || entry.accountName || 'Otros gastos';
    totals.set(key, (totals.get(key) ?? 0) + entry.amount);
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, slices);
  const tail = sorted.slice(slices);
  const points: ChartPoint[] = head.map(([label, value], index) => ({
    label,
    value,
    color: paletteColor(index),
  }));

  if (tail.length > 0) {
    points.push({
      label: 'Otros',
      value: tail.reduce((acc, [, value]) => acc + value, 0),
      color: paletteColor(head.length),
    });
  }

  return points;
}

/** Saldos por tipo de cuenta, para el donut de estructura patrimonial. */
export function accountsByType(accounts: Account[]): ChartPoint[] {
  const labels: Record<Account['type'], string> = {
    asset: 'Activos',
    liability: 'Pasivos',
    equity: 'Patrimonio',
    income: 'Ingresos',
    expense: 'Gastos',
  };

  const totals = new Map<string, number>();
  for (const account of accounts) {
    const label = labels[account.type] ?? account.type;
    totals.set(label, (totals.get(label) ?? 0) + Math.abs(account.balance));
  }

  return Array.from(totals.entries())
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({ label, value, color: paletteColor(index) }));
}

/** Variación porcentual entre los dos últimos puntos de una serie. */
export function seriesDelta(points: ChartPoint[]): number | null {
  if (points.length < 2) return null;
  const previous = points[points.length - 2].value;
  const current = points[points.length - 1].value;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Top cuentas por saldo absoluto, para la barra lateral del tablero. */
export function topAccounts(accounts: Account[], limit = 5): Account[] {
  return [...accounts]
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, limit);
}
