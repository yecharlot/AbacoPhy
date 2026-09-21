import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Summary } from '../../domain/entities/Equation';
import type { CreateExpenseEntry } from '../../domain/usecases/CreateExpenseEntry';
import type { CreateIncomeEntry } from '../../domain/usecases/CreateIncomeEntry';
import type { GetSummary } from '../../domain/usecases/GetSummary';
import type { ListAccounts } from '../../domain/usecases/ListAccounts';
import type { ListEntries } from '../../domain/usecases/ListEntries';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type AccountingState = {
  accountsStatus: LoadStatus;
  accounts: Account[];
  entriesStatus: LoadStatus;
  entries: Entry[];
  summaryStatus: LoadStatus;
  summary: Summary | null;
  error: string | null;
  saving: boolean;
};

type Deps = {
  listAccounts: ListAccounts;
  listEntries: ListEntries;
  createIncome: CreateIncomeEntry;
  createExpense: CreateExpenseEntry;
  getSummary: GetSummary;
};

export function createAccountingStore(deps: Deps) {
  let state: AccountingState = {
    accountsStatus: 'idle',
    accounts: [],
    entriesStatus: 'idle',
    entries: [],
    summaryStatus: 'idle',
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
    async loadAccounts(): Promise<void> {
      set({ accountsStatus: 'loading', error: null });
      try {
        const accounts = await deps.listAccounts.execute();
        set({
          accounts,
          accountsStatus: accounts.length ? 'success' : 'empty',
        });
      } catch (err) {
        set({
          accountsStatus: 'error',
          error: err instanceof Error ? err.message : 'Error al cargar cuentas',
        });
      }
    },
    async loadEntries(): Promise<void> {
      set({ entriesStatus: 'loading', error: null });
      try {
        const entries = await deps.listEntries.execute();
        set({
          entries,
          entriesStatus: entries.length ? 'success' : 'empty',
        });
      } catch (err) {
        set({
          entriesStatus: 'error',
          error: err instanceof Error ? err.message : 'Error al cargar asientos',
        });
      }
    },
    async loadSummary(): Promise<void> {
      set({ summaryStatus: 'loading', error: null });
      try {
        const summary = await deps.getSummary.execute();
        set({ summary, summaryStatus: 'success' });
      } catch (err) {
        set({
          summaryStatus: 'error',
          error: err instanceof Error ? err.message : 'Error al cargar resumen',
        });
      }
    },
    async createIncome(input: {
      accountId: string;
      amount: number;
      description: string;
      date?: string;
    }): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createIncome.execute(input);
        set({ saving: false });
        await Promise.all([this.loadSummary(), this.loadEntries(), this.loadAccounts()]);
      } catch (err) {
        set({
          saving: false,
          error: err instanceof Error ? err.message : 'Error al registrar ingreso',
        });
        throw err;
      }
    },
    async createExpense(input: {
      accountId: string;
      amount: number;
      description: string;
      date?: string;
    }): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createExpense.execute(input);
        set({ saving: false });
        await Promise.all([this.loadSummary(), this.loadEntries(), this.loadAccounts()]);
      } catch (err) {
        set({
          saving: false,
          error: err instanceof Error ? err.message : 'Error al registrar gasto',
        });
        throw err;
      }
    },
  };
}

export type AccountingStore = ReturnType<typeof createAccountingStore>;
