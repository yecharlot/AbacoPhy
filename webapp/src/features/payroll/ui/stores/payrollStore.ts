import type { Employee } from '../../domain/entities/Employee';
import type { Payslip } from '../../domain/entities/Payslip';
import type { ListEmployees } from '../../domain/usecases/ListEmployees';
import type { CreateEmployee } from '../../domain/usecases/CreateEmployee';
import type { ListPayslips } from '../../domain/usecases/ListPayslips';
import type { CreatePayslip } from '../../domain/usecases/CreatePayslip';

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
        const message = err instanceof Error ? err.message : 'Error al cargar empleados';
        set({ status: 'error', error: message });
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
        const message = err instanceof Error ? err.message : 'Error al cargar liquidaciones';
        set({ status: 'error', error: message });
      }
    },
    async addEmployee(employee: Omit<Employee, 'id' | 'active'>): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createEmployee.execute(employee);
        set({ saving: false });
        await this.loadEmployees();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar empleado';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async addPayslip(payslip: Omit<Payslip, 'id' | 'dateEmitted'>): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createPayslip.execute(payslip);
        set({ saving: false });
        await this.loadPayslips();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al generar liquidación';
        set({ saving: false, error: message });
        throw err;
      }
    },
  };
}

export type PayrollStore = ReturnType<typeof createPayrollStore>;
