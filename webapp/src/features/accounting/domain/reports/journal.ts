import type { Account } from '../entities/Account';
import type { Entry, EntryType } from '../entities/Entry';

export type JournalRow = {
  id: string;
  date: string;
  type: EntryType | string;
  description: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  currency: string;
  counterpart?: string;
};

export type JournalBook = {
  rows: JournalRow[];
  totalIncome: number;
  totalExpense: number;
  count: number;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function entryDescription(e: Entry): string {
  // Compat: mapper histórico usa concept; entidad canónica description
  const any = e as Entry & { concept?: string };
  return (any.description || any.concept || '').trim() || '—';
}

/**
 * Libro diario: asientos en orden cronológico (más reciente primero).
 * Resuelve nombre/código de cuenta desde el plan cuando está disponible.
 */
export function buildJournal(entries: Entry[], accounts: Account[] = []): JournalBook {
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const rows: JournalRow[] = [...entries]
    .map((e) => {
      const acc = byId.get(e.accountId);
      return {
        id: e.id,
        date: e.date || '',
        type: e.type,
        description: entryDescription(e),
        accountId: e.accountId,
        accountCode: acc?.code || '—',
        accountName: acc?.name || e.accountId || '—',
        amount: n(e.amount),
        currency: e.currency || '',
        counterpart: e.counterpart,
      };
    })
    .sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return b.id.localeCompare(a.id);
    });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const r of rows) {
    if (r.type === 'income') totalIncome += Math.abs(r.amount);
    else if (r.type === 'expense') totalExpense += Math.abs(r.amount);
  }

  return {
    rows,
    totalIncome,
    totalExpense,
    count: rows.length,
  };
}

export const ENTRY_TYPE_LABEL: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};
