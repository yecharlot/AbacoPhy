import type { AppContainer } from '../../../infrastructure/di';
import { PayrollRepositoryImpl } from '../data/repositories/PayrollRepositoryImpl';
import {
  CreateEmployee,
  CreatePayslip,
  DownloadPayrollPdf,
  ListEmployees,
  ListPayslips,
} from '../domain/usecases';
import { createPayrollStore, type PayrollStore } from '../ui/stores/payrollStore';

export type PayrollModule = {
  payrollStore: PayrollStore;
};

export function createPayrollModule(container: AppContainer): PayrollModule {
  const repo = new PayrollRepositoryImpl(container.http);
  const listEmployees = new ListEmployees(repo);
  const createEmployee = new CreateEmployee(repo);
  const listPayslips = new ListPayslips(repo);
  const createPayslip = new CreatePayslip(repo);
  const downloadPdf = new DownloadPayrollPdf(repo);

  const payrollStore = createPayrollStore({
    listEmployees,
    createEmployee,
    listPayslips,
    createPayslip,
    downloadPdf,
  });

  return { payrollStore };
}
