import type { CreateEmployeeInput, Employee } from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip } from '../../domain/entities/Payslip';
import type { CreateEmployee } from '../../domain/usecases/CreateEmployee';
import type { CreatePayslip } from '../../domain/usecases/CreatePayslip';
import type { ListEmployees } from '../../domain/usecases/ListEmployees';
import type { ListPayslips } from '../../domain/usecases/ListPayslips';

export type PayrollStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type PayrollState = {
  status: PayrollStatus;
  employees: Employee[];
  payslips: Payslip[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  listEmployees: ListEmployees;
  createEmployee: CreateEmployee;
  listPayslips: ListPayslips;
  createPayslip: CreatePayslip;
};

export function createPayrollStore(deps: Deps) {
  let state: PayrollState = {
    status: 'idle',
    employees: [],
    payslips: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: PayrollState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<PayrollState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
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
      set({ status: 'loading', error: null });
      try {
        const employees = await deps.listEmployees.execute();
        set({
          status: employees.length ? 'success' : 'empty',
          employees,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar empleados') });
      }
    },
    async loadPayslips(employeeId?: string): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const payslips = await deps.listPayslips.execute(employeeId);
        set({
          status: payslips.length ? 'success' : 'empty',
          payslips,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar liquidaciones') });
      }
    },
    async addEmployee(input: CreateEmployeeInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createEmployee.execute(input);
        set({ saving: false });
        await this.loadEmployees();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al registrar empleado') });
        throw err;
      }
    },
    async addPayslip(input: CreatePayslipInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createPayslip.execute(input);
        set({ saving: false });
        await this.loadPayslips();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al generar liquidación') });
        throw err;
      }
    },
  };
}

export type PayrollStore = ReturnType<typeof createPayrollStore>;
