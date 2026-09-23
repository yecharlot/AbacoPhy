/**
 * Seed de asientos (solo desarrollo).
 * Orquesta store/use cases — sin reglas contables propias.
 */
import type { Entry } from '../../domain/entities/Entry';
import type { AccountingStore } from '../stores/accountingStore';

export type SeedEntryRow = {
  type: 'income' | 'expense';
  /** Domain id; si falta se resuelve por tipo desde accounts del store/API. */
  accountId?: string;
  amount: number;
  concept: string;
  date: string;
  currency?: string;
  category?: string;
};

export type SeedEntriesPayload = {
  entries: SeedEntryRow[];
};

export function buildSampleEntriesPayload(days = 14): SeedEntriesPayload {
  const entries: SeedEntryRow[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const day = d.getDate();
    entries.push({
      type: 'income',
      amount: Math.round((1200 + (day % 7) * 350 + i * 15) * 100) / 100,
      concept: `Venta mostrador ${date}`,
      date,
      currency: 'CUP',
    });
    if (day % 2 === 0) {
      entries.push({
        type: 'expense',
        amount: Math.round((400 + (day % 5) * 120 + i * 8) * 100) / 100,
        concept: `Gasto operativo ${date}`,
        date,
        currency: 'CUP',
        category: 'Operaciones',
      });
    }
  }
  return { entries };
}

export async function seedEntriesViaStore(
  store: AccountingStore,
  payload: unknown,
): Promise<{ ok: number; fail: number; message?: string }> {
  const data = payload as SeedEntriesPayload;
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('Se espera { "entries": [ { type, amount, concept, date, ... } ] }');
  }

  // Asegura cuentas en estado
  if (!store.getState().accounts.length) {
    await store.loadAccounts();
  }
  const accounts = store.getState().accounts;
  const incomeId = accounts.find((a) => a.type === 'income')?.id;
  const expenseId = accounts.find((a) => a.type === 'expense')?.id;

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  for (const row of data.entries) {
    const accountId =
      row.accountId || (row.type === 'income' ? incomeId : expenseId) || '';
    if (!accountId) {
      fail++;
      errors.push(`Sin accountId para ${row.type}`);
      continue;
    }
    const body: Omit<Entry, 'id' | 'type'> = {
      date: row.date,
      concept: row.concept,
      amount: row.amount,
      currency: row.currency ?? 'CUP',
      accountId,
      category: row.category,
    };
    try {
      if (row.type === 'income') await store.addIncome(body);
      else await store.addExpense(body);
      ok++;
    } catch (e) {
      fail++;
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Recargar tablero (pide más asientos si el store lo permite)
  await store.loadDashboard().catch(() => undefined);

  return {
    ok,
    fail,
    message: `Asientos: ${ok} creados, ${fail} fallidos${
      errors.length ? ` · ${errors.slice(0, 3).join('; ')}` : ''
    }`,
  };
}
