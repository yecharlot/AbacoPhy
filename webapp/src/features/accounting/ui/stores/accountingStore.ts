import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';
import type { ListAccounts } from '../../domain/usecases/ListAccounts';
import type { ListEntries } from '../../domain/usecases/ListEntries';
import type { GetSummary } from '../../domain/usecases/GetSummary';
import type { CreateIncomeEntry } from '../../domain/usecases/CreateIncomeEntry';
import type { CreateExpenseEntry } from '../../domain/usecases/CreateExpenseEntry';

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
  /** Bus compartido: al emitir ledger.changed se refresca el dashboard. */
  appDataBus?: { on(event: 'ledger.changed', listener: () => void): () => void; emit(event: 'ledger.changed'): void };
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
  let loadSeq = 0;

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<AccountingState>) {
    state = { ...state, ...partial };
    emit();
  }

  async function loadDashboard(opts?: { soft?: boolean }): Promise<void> {
    const seq = ++loadSeq;
    // soft: no pasar por loading para no vaciar UI si ya hay summary
    if (!opts?.soft || !state.summary) {
      set({ status: 'loading', error: null });
    }
    try {
      const [accounts, entries, summary] = await Promise.all([
        deps.listAccounts.execute().catch(() => []),
        deps.listEntries.execute({ limit: 5000 }).catch(() => []),
        deps.getSummary.execute(),
      ]);
      if (seq !== loadSeq) return; // respuesta vieja descartada
      set({
        status: 'success',
        accounts,
        entries,
        // nuevo objeto siempre → reactividad completa en EquationCard
        summary: summary ? { ...summary } : null,
        error: null,
      });
    } catch (err) {
      if (seq !== loadSeq) return;
      const message = err instanceof Error ? err.message : 'Error al cargar resumen contable';
      set({ status: 'error', error: message });
    }
  }

  // Invalidación en vivo: venta / asiento / recepción contable
  const unsubBus = deps.appDataBus?.on('ledger.changed', () => {
    void loadDashboard({ soft: true });
  });

  return {
    subscribe(fn: (s: AccountingState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): AccountingState {
      return state;
    },
    /** Llamar al desmontar app si hace falta. */
    destroy(): void {
      unsubBus?.();
    },
    loadDashboard,

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
    async loadEntries(params?: { type?: string; from?: string; to?: string; limit?: number }): Promise<void> {
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
    async addIncome(entry: Omit<Entry, 'id' | 'type'>): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createIncome.execute(entry);
        set({ saving: false });
        deps.appDataBus?.emit('ledger.changed');
        await loadDashboard({ soft: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar ingreso';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async addExpense(entry: Omit<Entry, 'id' | 'type'>): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createExpense.execute(entry);
        set({ saving: false });
        deps.appDataBus?.emit('ledger.changed');
        await loadDashboard({ soft: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar gasto';
        set({ saving: false, error: message });
        throw err;
      }
    },
  };
}

export type AccountingStore = ReturnType<typeof createAccountingStore>;
