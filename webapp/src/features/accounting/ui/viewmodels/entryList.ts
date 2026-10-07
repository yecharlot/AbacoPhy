import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';

export type EntryListFilter = 'all' | 'month' | 'week';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function accountName(accounts: Account[], id: string): string {
  const a = accounts.find((x) => x.id === id);
  return a ? `${a.code} · ${a.name}` : id || '—';
}

export function filterEntriesByType(
  entries: Entry[],
  type: 'income' | 'expense',
  query: string,
  period: EntryListFilter,
  now = Date.now(),
): Entry[] {
  const q = query.trim().toLowerCase();
  const weekAgo = now - WEEK_MS;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthTs = monthStart.getTime();

  return entries
    .filter((e) => e.type === type)
    .filter((e) => {
      if (!q) return true;
      const hay = `${e.description || ''} ${e.concept || ''} ${e.accountName || ''} ${e.accountId}`.toLowerCase();
      return hay.includes(q);
    })
    .filter((e) => {
      if (period === 'all') return true;
      const t = e.date ? Date.parse(e.date) : 0;
      if (!Number.isFinite(t) || t <= 0) return period === 'all';
      if (period === 'week') return t >= weekAgo;
      if (period === 'month') return t >= monthTs;
      return true;
    })
    .sort((a, b) => {
      const ta = a.date ? Date.parse(a.date) : 0;
      const tb = b.date ? Date.parse(b.date) : 0;
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
}

export function sumAmounts(entries: Entry[]): number {
  return entries.reduce((s, e) => s + (e.amount || 0), 0);
}

export function typeLabel(type: string): string {
  switch (type) {
    case 'asset':
      return 'Activo';
    case 'liability':
      return 'Pasivo';
    case 'equity':
      return 'Patrimonio';
    case 'income':
      return 'Ingreso';
    case 'expense':
      return 'Gasto';
    default:
      return type || '—';
  }
}
