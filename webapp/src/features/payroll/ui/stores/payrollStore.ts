import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip } from '../../domain/entities/Payslip';
import type { Employee } from '../../domain/entities/Employee';
import type { CreateEmployee } from '../../domain/usecases';
import type { UpdateEmployee } from '../../domain/usecases';
import type { DeactivateEmployee } from '../../domain/usecases';
import type { CreatePayslip } from '../../domain/usecases';
import type { ListEmployees } from '../../domain/usecases';
import type { ListPayslips } from '../../domain/usecases';
import type { DownloadPayrollPdf } from '../../domain/usecases';

export type PayrollStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type PayrollState = {
  status: PayrollStatus;
  employees: Employee[];
  payslips: Payslip[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  appDataBus?: { emit(event: 'ledger.changed'): void };
  listEmployees: ListEmployees;
  createEmployee: CreateEmployee;
  updateEmployee: UpdateEmployee;
  deactivateEmployee: DeactivateEmployee;
  listPayslips: ListPayslips;
  createPayslip: CreatePayslip;
  downloadPdf: DownloadPayrollPdf;
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
    async editEmployee(input: UpdateEmployeeInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.updateEmployee.execute(input);
        set({ saving: false });
        await this.loadEmployees();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al actualizar empleado') });
        throw err;
      }
    },
    async dismissEmployee(id: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.deactivateEmployee.execute(id);
        set({ saving: false });
        await this.loadEmployees();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al dar de baja') });
        throw err;
      }
    },
    async addPayslip(input: CreatePayslipInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createPayslip.execute(input);
        deps.appDataBus?.emit('ledger.changed');
        set({ saving: false });
        await this.loadPayslips();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al generar liquidación') });
        throw err;
      }
    },
    async downloadPdf(period: string): Promise<void> {
      try {
        const blob = await deps.downloadPdf.execute(period);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nomina-${period}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        set({ error: messageOf(err, 'Error al descargar PDF de nómina') });
        throw err;
      }
    },
  };
}

export type PayrollStore = ReturnType<typeof createPayrollStore>;
