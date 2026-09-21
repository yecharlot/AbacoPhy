import type { CreateEmployeeInput, Employee } from '../entities/Employee';
import type { CreatePayslipInput, Payslip } from '../entities/Payslip';

export interface PayrollRepository {
  listEmployees(): Promise<Employee[]>;
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  listPayslips(): Promise<Payslip[]>;
  createPayslip(input: CreatePayslipInput): Promise<Payslip>;
  /** Optional: period YYYY-MM or 'all' */
  downloadPdf(period: string): Promise<Blob>;
}
