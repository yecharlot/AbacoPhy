import type { AppContainer } from '../../../infrastructure/di';
import { PayrollRepositoryImpl } from '../data/repositories/PayrollRepositoryImpl';
import { ListEmployees } from '../domain/usecases/ListEmployees';
import { CreateEmployee } from '../domain/usecases/CreateEmployee';
import { UpdateEmployee } from '../domain/usecases/UpdateEmployee';
import { DeactivateEmployee } from '../domain/usecases/DeactivateEmployee';
import { ListPayslips } from '../domain/usecases/ListPayslips';
import { CreatePayslip } from '../domain/usecases/CreatePayslip';
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
  });

  return { payrollStore };
}
