import type { AppContainer } from '../../../infrastructure/di';
import { PayrollRepositoryImpl } from '../data/repositories/PayrollRepositoryImpl';
import { ListEmployees } from '../domain/usecases';
import { CreateEmployee } from '../domain/usecases';
import { UpdateEmployee } from '../domain/usecases';
import { DeactivateEmployee } from '../domain/usecases';
import { ListPayslips } from '../domain/usecases';
import { CreatePayslip } from '../domain/usecases';
import { DownloadPayrollPdf } from '../domain/usecases';
import { createPayrollStore, type PayrollStore } from '../ui/stores/payrollStore';

export type PayrollModule = {
  payrollStore: PayrollStore;
};

export function createPayrollModule(container: AppContainer): PayrollModule {
  const repository = new PayrollRepositoryImpl(container.http);

  const payrollStore = createPayrollStore({
    appDataBus: container.appDataBus,
    listEmployees: new ListEmployees(repository),
    createEmployee: new CreateEmployee(repository),
    updateEmployee: new UpdateEmployee(repository),
    deactivateEmployee: new DeactivateEmployee(repository),
    listPayslips: new ListPayslips(repository),
    createPayslip: new CreatePayslip(repository),
    downloadPdf: new DownloadPayrollPdf(repository),
  });

  return { payrollStore };
}
