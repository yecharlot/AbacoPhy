import type { AppContainer } from '../../../infrastructure/di';
import { PayrollRepositoryImpl } from '../data/repositories/PayrollRepositoryImpl';
import { ListEmployees } from '../domain/usecases/ListEmployees';
import { CreateEmployee } from '../domain/usecases/CreateEmployee';
import { ListPayslips } from '../domain/usecases/ListPayslips';
import { CreatePayslip } from '../domain/usecases/CreatePayslip';
import { createPayrollStore } from '../ui/stores/payrollStore';

export function createPayrollModule(container: AppContainer) {
  const repository = new PayrollRepositoryImpl(container.http);

  const listEmployees = new ListEmployees(repository);
  const createEmployee = new CreateEmployee(repository);
  const listPayslips = new ListPayslips(repository);
  const createPayslip = new CreatePayslip(repository);

  const payrollStore = createPayrollStore({
    listEmployees,
    createEmployee,
    listPayslips,
    createPayslip,
  });

  return {
    payrollStore,
  };
}
