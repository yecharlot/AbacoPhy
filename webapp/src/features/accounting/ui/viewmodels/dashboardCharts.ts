/**
 * Agregaciones de presentación para el tablero.
 * Solo agrupan y formatean datos del backend: sin partida doble ni saldos.
 */
import type { ChartPoint, ChartSeries } from '../../../../infrastructure/ui/charts';
import { paletteColor } from '../../../../infrastructure/ui/charts';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';

export type ChartScope = 'day' | 'week' | 'month' | 'year';

export const CHART_SCOPE_OPTIONS: Array<{ id: ChartScope; label: string }> = [
  { id: 'day', label: 'Diario' },
  { id: 'week', label: 'Semanal' },
  { id: 'month', label: 'Mensual' },
  { id: 'year', label: 'Anual' },
];

/** Cuántos buckets mostrar por alcance (evita ejes ilegibles). */
const SCOPE_LIMIT: Record<ChartScope, number> = {
  day: 14,
  week: 12,
  month: 12,
  year: 5,
};

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

function parseDate(raw: string): Date | null {
  if (!raw || raw.length < 10) return null;
  const d = new Date(raw.slice(0, 10) + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Clave estable de bucket + etiqueta corta de eje. */
export function bucketFor(date: string, scope: ChartScope): { key: string; label: string } | null {
  const d = parseDate(date);
  if (!d) return null;

  if (scope === 'day') {
    const key = date.slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label };
  }

  if (scope === 'week') {
    // ISO-ish: año + número de semana
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const year = tmp.getUTCFullYear();
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    return { key, label: `S${week}` };
  }

  if (scope === 'month') {
    const key = date.slice(0, 7);
    const index = d.getMonth();
    return { key, label: MONTH_LABELS[index] ?? key };
  }

  // year
  const key = String(d.getFullYear());
  return { key, label: key };
}

function aggregateByScope(
  entries: Entry[],
  type: Entry['type'],
  scope: ChartScope,
  limit = SCOPE_LIMIT[scope],
): ChartPoint[] {
  const totals = new Map<string, { value: number; label: string }>();

  for (const entry of entries) {
    if (entry.type !== type) continue;
    const bucket = bucketFor(entry.date, scope);
    if (!bucket) continue;
    const prev = totals.get(bucket.key);
    totals.set(bucket.key, {
      value: (prev?.value ?? 0) + entry.amount,
      label: bucket.label,
    });
  }

  return Array.from(totals.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-limit)
    .map(([, v]) => ({ label: v.label, value: v.value, hint: v.label }));
}

/** Serie neta (ingresos − gastos) alineada por buckets del alcance. */
export function netSeries(entries: Entry[], scope: ChartScope): ChartPoint[] {
  const income = aggregateByScope(entries, 'income', scope);
  const expense = aggregateByScope(entries, 'expense', scope);
  const labels = Array.from(
    new Set([...income.map((p) => p.label), ...expense.map((p) => p.label)]),
  );
  // Prefer key order via re-aggregation
  const incomeMap = new Map(income.map((p) => [p.label, p.value]));
  const expenseMap = new Map(expense.map((p) => [p.label, p.value]));
  // Rebuild from union of keys sorted by chronological key stored in hint? labels may collide
  // Better: use keys from both aggregates
  const totals = new Map<string, { label: string; income: number; expense: number }>();
  for (const entry of entries) {
    if (entry.type !== 'income' && entry.type !== 'expense') continue;
    const bucket = bucketFor(entry.date, scope);
    if (!bucket) continue;
    const cur = totals.get(bucket.key) ?? { label: bucket.label, income: 0, expense: 0 };
    if (entry.type === 'income') cur.income += entry.amount;
    else cur.expense += entry.amount;
    totals.set(bucket.key, cur);
  }
  return Array.from(totals.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-SCOPE_LIMIT[scope])
    .map(([, v]) => ({ label: v.label, value: v.income - v.expense }));
}

/** Series para AreaChart: ingresos + gastos (+ neto opcional como línea de contexto). */
export function flowSeries(
  entries: Entry[],
  scope: ChartScope,
  includeNet = true,
): ChartSeries[] {
  const incomePts = aggregateByScope(entries, 'income', scope);
  const expensePts = aggregateByScope(entries, 'expense', scope);

  // Alinear etiquetas: unión ordenada por key
  const keys = new Map<string, string>();
  for (const entry of entries) {
    if (entry.type !== 'income' && entry.type !== 'expense') continue;
    const b = bucketFor(entry.date, scope);
    if (b) keys.set(b.key, b.label);
  }
  const ordered = Array.from(keys.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-SCOPE_LIMIT[scope]);

  const incomeByKey = new Map<string, number>();
  const expenseByKey = new Map<string, number>();
  for (const entry of entries) {
    const b = bucketFor(entry.date, scope);
    if (!b) continue;
    if (entry.type === 'income') {
      incomeByKey.set(b.key, (incomeByKey.get(b.key) ?? 0) + entry.amount);
    } else if (entry.type === 'expense') {
      expenseByKey.set(b.key, (expenseByKey.get(b.key) ?? 0) + entry.amount);
    }
  }

  const incomeAligned: ChartPoint[] = ordered.map(([key, label]) => ({
    label,
    value: incomeByKey.get(key) ?? 0,
    hint: key,
  }));
  const expenseAligned: ChartPoint[] = ordered.map(([key, label]) => ({
    label,
    value: expenseByKey.get(key) ?? 0,
    hint: key,
  }));

  const list: ChartSeries[] = [
    {
      id: 'income',
      label: 'Ingresos',
      color: 'var(--accent-green)',
      points: incomeAligned,
    },
    {
      id: 'expense',
      label: 'Gastos',
      color: 'var(--accent-pink)',
      points: expenseAligned,
    },
  ];

  if (includeNet) {
    list.push({
      id: 'net',
      label: 'Neto',
      color: 'var(--accent-cyan)',
      points: ordered.map(([key, label]) => ({
        label,
        value: (incomeByKey.get(key) ?? 0) - (expenseByKey.get(key) ?? 0),
        hint: key,
      })),
    });
  }

  return list;
}

/** @deprecated usar flowSeries / aggregate — se mantiene para pantallas existentes */
export function monthlySeries(
  entries: Entry[],
  type: Entry['type'],
  months = 6,
): ChartPoint[] {
  return aggregateByScope(entries, type, 'month', months);
}

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

export function seriesDelta(points: ChartPoint[]): number | null {
  if (points.length < 2) return null;
  const previous = points[points.length - 2].value;
  const current = points[points.length - 1].value;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function topAccounts(accounts: Account[], limit = 5): Account[] {
  return [...accounts]
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, limit);
}
