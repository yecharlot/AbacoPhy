import type { Employee } from '../entities/Employee';
import type { Payslip } from '../entities/Payslip';

export interface PayrollRepository {
  getEmployees(): Promise<Employee[]>;
  createEmployee(employee: Omit<Employee, 'id' | 'active'>): Promise<Employee>;
  getPayslips(employeeId?: string): Promise<Payslip[]>;
  createPayslip(payslip: Omit<Payslip, 'id' | 'dateEmitted'>): Promise<Payslip>;
}
