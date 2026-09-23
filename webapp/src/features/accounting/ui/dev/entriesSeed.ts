/**
 * Seed de asientos (solo desarrollo) → API real.
 * Body alineado con Go: type, account_id, amount, description, date, currency.
 */
import type { Entry } from '../../domain/entities/Entry';
import type { AccountingStore } from '../stores/accountingStore';

export type SeedEntryRow = {
  type: 'income' | 'expense';
  accountId?: string;
  amount: number;
  /** Se envía al API como description */
  concept: string;
  date: string;
  currency?: string;
};

export type SeedEntriesPayload = {
  entries: SeedEntryRow[];
};

/** Sample válido listo para el textarea (~14 días, ingresos + gastos). */
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
    throw new Error('Se espera un objeto con "entries": [ ... ]');
  }

  if (!store.getState().accounts.length) {
    await store.loadAccounts();
  }
  const accounts = store.getState().accounts;
  const incomeId = accounts.find((a) => a.type === 'income' && a.id)?.id;
  const expenseId = accounts.find((a) => a.type === 'expense' && a.id)?.id;

  if (!incomeId && !expenseId) {
    throw new Error(
      'No hay cuentas income/expense en el plan de cuentas. Revisa GET /accounts.',
    );
  }

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
    if (!row.amount || row.amount <= 0) {
      fail++;
      errors.push(`Importe inválido ${row.amount}`);
      continue;
    }
    const body: Omit<Entry, 'id' | 'type'> = {
      date: row.date,
      concept: row.concept, // mapper → description
      amount: Number(row.amount),
      currency: row.currency ?? 'CUP',
      accountId,
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

  await store.loadDashboard().catch(() => undefined);

  return {
    ok,
    fail,
    message: `Asientos: ${ok} creados, ${fail} fallidos${
      errors.length ? ` · ${errors.slice(0, 3).join('; ')}` : ''
    }`,
  };
}
