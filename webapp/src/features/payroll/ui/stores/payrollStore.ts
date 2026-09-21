import type { CreateEmployeeInput, Employee } from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip } from '../../domain/entities/Payslip';
import type { CreateEmployee } from '../../domain/usecases/CreateEmployee';
import type { CreatePayslip } from '../../domain/usecases/CreatePayslip';
import type { DownloadPayrollPdf } from '../../domain/usecases/DownloadPayrollPdf';
import type { ListEmployees } from '../../domain/usecases/ListEmployees';
import type { ListPayslips } from '../../domain/usecases/ListPayslips';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type PayrollState = {
  employeesStatus: LoadStatus;
  employees: Employee[];
  payslipsStatus: LoadStatus;
  payslips: Payslip[];
  error: string | null;
  saving: boolean;
  downloading: boolean;
};

type Deps = {
  listEmployees: ListEmployees;
  createEmployee: CreateEmployee;
  listPayslips: ListPayslips;
  createPayslip: CreatePayslip;
  downloadPdf: DownloadPayrollPdf;
};

export function createPayrollStore(deps: Deps) {
  let state: PayrollState = {
    employeesStatus: 'idle',
    employees: [],
    payslipsStatus: 'idle',
    payslips: [],
    error: null,
    saving: false,
    downloading: false,
  };
  const listeners = new Set<(s: PayrollState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<PayrollState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: PayrollState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): PayrollState {
      return state;
    },
    async loadEmployees(): Promise<void> {
      set({ employeesStatus: 'loading', error: null });
      try {
        const employees = await deps.listEmployees.execute();
        set({
          employees,
          employeesStatus: employees.length ? 'success' : 'empty',
        });
      } catch (err) {
        set({
          employeesStatus: 'error',
          error: err instanceof Error ? err.message : 'Error al cargar trabajadores',
        });
      }
    },
    async loadPayslips(): Promise<void> {
      set({ payslipsStatus: 'loading', error: null });
      try {
        const payslips = await deps.listPayslips.execute();
        set({
          payslips,
          payslipsStatus: payslips.length ? 'success' : 'empty',
        });
      } catch (err) {
        set({
          payslipsStatus: 'error',
          error: err instanceof Error ? err.message : 'Error al cargar liquidaciones',
        });
      }
    },
    async createEmployee(input: CreateEmployeeInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createEmployee.execute(input);
        set({ saving: false });
        await this.loadEmployees();
      } catch (err) {
        set({
          saving: false,
          error: err instanceof Error ? err.message : 'Error al crear trabajador',
        });
        throw err;
      }
    },
    async createPayslip(input: CreatePayslipInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createPayslip.execute(input);
        set({ saving: false });
        await this.loadPayslips();
      } catch (err) {
        set({
          saving: false,
          error: err instanceof Error ? err.message : 'Error al crear liquidación',
        });
        throw err;
      }
    },
    async downloadPdf(period: string): Promise<void> {
      set({ downloading: true, error: null });
      try {
        const blob = await deps.downloadPdf.execute(period);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nomina-${period || 'all'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        set({ downloading: false });
      } catch (err) {
        set({
          downloading: false,
          error: err instanceof Error ? err.message : 'Error al descargar PDF',
        });
        throw err;
      }
    },
  };
}

export type PayrollStore = ReturnType<typeof createPayrollStore>;
