import type {
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
} from '../entities/Employee';
import type { CreatePayslipInput, Payslip } from '../entities/Payslip';

export interface PayrollRepository {
  getEmployees(): Promise<Employee[]>;
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  updateEmployee(input: UpdateEmployeeInput): Promise<Employee>;
  deactivateEmployee(id: string): Promise<void>;
  getPayslips(employeeId?: string): Promise<Payslip[]>;
  createPayslip(input: CreatePayslipInput): Promise<Payslip>;
  getPayrollPdf(period: string): Promise<Blob>;
}
