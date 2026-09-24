import type { CreateEmployeeInput, Employee } from '../entities/Employee';
import type { CreatePayslipInput, Payslip } from '../entities/Payslip';

export interface PayrollRepository {
  getEmployees(): Promise<Employee[]>;
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  getPayslips(employeeId?: string): Promise<Payslip[]>;
  createPayslip(input: CreatePayslipInput): Promise<Payslip>;
}
