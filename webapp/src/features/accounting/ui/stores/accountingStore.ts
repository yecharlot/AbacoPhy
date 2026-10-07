import type { Account } from '../../domain/entities/Account';
import type { CreateEntryInput, Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';
import type { ListAccounts } from '../../domain/usecases';
import type { ListEntries } from '../../domain/usecases';
import type { GetSummary } from '../../domain/usecases';
import type { CreateIncomeEntry } from '../../domain/usecases';
import type { CreateExpenseEntry } from '../../domain/usecases';

export type AccountingStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type AccountingState = {
  status: AccountingStatus;
  accounts: Account[];
  entries: Entry[];
  summary: Equation | null;
  error: string | null;
  saving: boolean;
};

type Deps = {
  listAccounts: ListAccounts;
  listEntries: ListEntries;
  getSummary: GetSummary;
  createIncome: CreateIncomeEntry;
  createExpense: CreateExpenseEntry;
};

export function createAccountingStore(deps: Deps) {
  let state: AccountingState = {
    status: 'idle',
    accounts: [],
    entries: [],
    summary: null,
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: AccountingState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<AccountingState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: AccountingState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): AccountingState {
      return state;
    },
    async loadDashboard(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [accounts, entries, summary] = await Promise.all([
          deps.listAccounts.execute().catch(() => []),
          deps.listEntries.execute({ limit: 5000 }).catch(() => []),
          deps.getSummary.execute(),
        ]);
        set({
          status: 'success',
          accounts,
          entries,
          summary,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar resumen contable';
        set({ status: 'error', error: message });
      }
    },
    async loadAccounts(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const accounts = await deps.listAccounts.execute();
        set({
          status: accounts.length ? 'success' : 'empty',
          accounts,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar cuentas';
        set({ status: 'error', error: message });
      }
    },
    async loadEntries(params?: { type?: string; limit?: number }): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const entries = await deps.listEntries.execute(params);
        set({
          status: entries.length ? 'success' : 'empty',
          entries,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar asientos';
        set({ status: 'error', error: message });
      }
    },
    async addIncome(entry: Omit<CreateEntryInput, 'type'>): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createIncome.execute(entry);
        const [accounts, entries] = await Promise.all([
          deps.listAccounts.execute().catch(() => state.accounts),
          deps.listEntries.execute({ limit: 5000 }).catch(() => state.entries),
        ]);
        set({
          saving: false,
          accounts,
          entries,
          status: entries.length || accounts.length ? 'success' : 'empty',
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar ingreso';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async addExpense(entry: Omit<CreateEntryInput, 'type'>): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createExpense.execute(entry);
        const [accounts, entries] = await Promise.all([
          deps.listAccounts.execute().catch(() => state.accounts),
          deps.listEntries.execute({ limit: 5000 }).catch(() => state.entries),
        ]);
        set({
          saving: false,
          accounts,
          entries,
          status: entries.length || accounts.length ? 'success' : 'empty',
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar gasto';
        set({ saving: false, error: message });
        throw err;
      }
    },
    createIncome(entry: Omit<CreateEntryInput, 'type'>): Promise<void> {
      return this.addIncome(entry);
    },
    createExpense(entry: Omit<CreateEntryInput, 'type'>): Promise<void> {
      return this.addExpense(entry);
    },
  };
}

export type AccountingStore = ReturnType<typeof createAccountingStore>;
