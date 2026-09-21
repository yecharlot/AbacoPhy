import type { HttpClient } from '../../../../infrastructure/data/http';
import type { EmployeeDto, PayslipDto } from '../dto/PayrollDto';

export class PayrollRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getEmployees(): Promise<{ employees: EmployeeDto[] }> {
    return this.http.get<{ employees: EmployeeDto[] }>('/payroll/employees');
  }

  createEmployee(body: Partial<EmployeeDto>): Promise<EmployeeDto> {
    return this.http.post<EmployeeDto>('/payroll/employees', body);
  }

  getPayslips(employeeId?: string): Promise<{ payslips: PayslipDto[] }> {
    const path = employeeId ? `/payroll/payslips?employee_id=${employeeId}` : '/payroll/payslips';
    return this.http.get<{ payslips: PayslipDto[] }>(path);
  }

  createPayslip(body: Partial<PayslipDto>): Promise<PayslipDto> {
    return this.http.post<PayslipDto>('/payroll/payslips', body);
  }
}
