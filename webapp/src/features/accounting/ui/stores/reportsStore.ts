import type { TrialBalance } from '../../domain/entities/TrialBalance';
import type { JournalEntry } from '../../domain/entities/JournalEntry';
import type { Equation } from '../../domain/entities/Equation';
import type { GetTrialBalance } from '../../domain/usecases/GetTrialBalance';
import type { GetIncomeStatement } from '../../domain/usecases/GetIncomeStatement';
import type { GetJournal } from '../../domain/usecases/GetJournal';
import {createAccountingStore} from "./accountingStore";

export type ReportType = 'trial-balance' | 'income-statement' | 'journal';

export type ReportsState = {
    activeReport: ReportType;
    trialBalance: TrialBalance | null;
    incomeStatement: Equation | null;
    journal: JournalEntry[];
    loading: boolean;
    error: string | null;
};

type ReportsDeps = {
    getTrialBalance: GetTrialBalance;
    getIncomeStatement: GetIncomeStatement;
    getJournal: GetJournal;
};

export function createReportsStore(deps: ReportsDeps) {
    let state: ReportsState = {
        activeReport: 'trial-balance',
        trialBalance: null,
        incomeStatement: null,
        journal: [],
        loading: false,
        error: null,
    };

    const listeners = new Set<(s: ReportsState) => void>();

    function set(newState: Partial<ReportsState>) {
        state = { ...state, ...newState };
        listeners.forEach((fn) => fn(state));
    }

    async function loadTrialBalance(): Promise<void> {
        set({ loading: true, error: null });
        try {
            const trialBalance = await deps.getTrialBalance.execute();
            set({ trialBalance, loading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al cargar balance de comprobación';
            set({ loading: false, error: message });
        }
    }

    async function loadIncomeStatement(): Promise<void> {
        set({ loading: true, error: null });
        try {
            const incomeStatement = await deps.getIncomeStatement.execute();
            set({ incomeStatement, loading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al cargar estado de resultados';
            set({ loading: false, error: message });
        }
    }

    async function loadJournal(): Promise<void> {
        set({ loading: true, error: null });
        try {
            const journal = await deps.getJournal.execute({ limit: 1000 });
            set({ journal, loading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al cargar libro diario';
            set({ loading: false, error: message });
        }
    }

    async function switchReport(reportType: ReportType): Promise<void> {
        set({ activeReport: reportType });

        if (reportType === 'trial-balance' && !state.trialBalance) {
            await loadTrialBalance();
        } else if (reportType === 'income-statement' && !state.incomeStatement) {
            await loadIncomeStatement();
        } else if (reportType === 'journal' && state.journal.length === 0) {
            await loadJournal();
        }
    }

    return {
        subscribe(fn: (s: ReportsState) => void): () => void {
            listeners.add(fn);
            fn(state);
            return () => listeners.delete(fn);
        },
        getState(): ReportsState {
            return state;
        },
        switchReport,
        loadTrialBalance,
        loadIncomeStatement,
        loadJournal,
    };
}

export type ReportsStore = ReturnType<typeof createReportsStore>;