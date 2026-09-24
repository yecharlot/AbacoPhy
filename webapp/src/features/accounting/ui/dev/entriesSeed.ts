/**
 * Seed ~2 años de flujo de ventas normal (ingresos/gastos) para gráficas.
 */
import type { Entry } from '../../domain/entities/Entry';
import type { AccountingStore } from '../stores/accountingStore';

export type SeedEntryRow = {
  type: 'income' | 'expense';
  accountId?: string;
  amount: number;
  concept: string;
  date: string;
  currency?: string;
};

export type SeedEntriesPayload = {
  entries: SeedEntryRow[];
};

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Flujo de ventas de 2 años (~730 días):
 * - tendencia suave de crecimiento
 * - estacionalidad semanal (finde más bajo)
 * - picos de cobro 1 y 15
 * - gastos fijos + variables
 */
export function buildSampleEntriesPayload(_spanDays = 730): SeedEntriesPayload {
  const entries: SeedEntryRow[] = [];
  const span = 730;

  for (let i = span - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    const d = new Date(date + 'T12:00:00');
    const dow = d.getDay();
    const day = d.getDate();
    const month = d.getMonth();

    // Crecimiento ~8% anual a lo largo de 2 años
    const growth = 1 + ((span - i) / span) * 0.16;
    // Estacional: Q4 un poco más alto
    const season = month >= 9 ? 1.12 : month >= 6 ? 1.04 : 0.97;
    const weekend = dow === 0 || dow === 6 ? 0.5 : 1;
    const payday = day === 1 || day === 15 ? 1.4 : day === 28 ? 0.85 : 1;

    const incomeBase =
      (1650 + (day % 11) * 95 + (i % 7) * 28) * growth * season * weekend * payday;

    entries.push({
      type: 'income',
      amount: Math.round(incomeBase * 100) / 100,
      concept: `Venta mostrador ${date}`,
      date,
      currency: 'CUP',
    });

    if (dow === 2 || dow === 5) {
      entries.push({
        type: 'income',
        amount: Math.round(incomeBase * 0.38 * 100) / 100,
        concept: `Cobro servicios ${date}`,
        date,
        currency: 'CUP',
      });
    }

    // Gastos: ~55–70% de ingresos típicos
    const expenseBase =
      (720 + (day % 8) * 55 + (i % 5) * 18) * growth * (weekend === 0.5 ? 0.7 : 1);
    entries.push({
      type: 'expense',
      amount: Math.round(expenseBase * 100) / 100,
      concept: `Gasto operativo ${date}`,
      date,
      currency: 'CUP',
    });

    if (day === 5 || day === 20) {
      entries.push({
        type: 'expense',
        amount: Math.round((1100 + (month + 1) * 40 + (i % 6) * 50) * growth * 100) / 100,
        concept: `Pago proveedor ${date}`,
        date,
        currency: 'CUP',
      });
    }

    if (day === 28) {
      entries.push({
        type: 'expense',
        amount: Math.round((2500 + month * 80) * growth * 100) / 100,
        concept: `Nómina parcial ${date}`,
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
    throw new Error('Se espera { "entries": [ { type, amount, concept, date } ] }');
  }

  if (!store.getState().accounts.length) {
    await store.loadAccounts();
  }
  const accounts = store.getState().accounts;
  const incomeId = accounts.find((a) => a.type === 'income')?.id;
  const expenseId = accounts.find((a) => a.type === 'expense')?.id;

  if (!incomeId || !expenseId) {
    throw new Error('Faltan cuentas income/expense en GET /accounts.');
  }

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  for (const row of data.entries) {
    const accountId = row.accountId || (row.type === 'income' ? incomeId : expenseId);
    if (!accountId || !row.amount || row.amount <= 0) {
      fail++;
      continue;
    }
    const body: Omit<Entry, 'id' | 'type'> = {
      date: row.date,
      concept: row.concept,
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
