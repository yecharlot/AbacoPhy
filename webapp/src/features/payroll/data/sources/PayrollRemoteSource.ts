import type { HttpClient } from '../../../../infrastructure/data/http';

export class PayrollRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getEmployees(): Promise<{ employees: unknown[] }> {
    return this.http.get<{ employees: unknown[] }>('/payroll/employees');
  }

  async createEmployee(body: Record<string, unknown>): Promise<unknown> {
    const res = await this.http.post<{ employee?: unknown } & Record<string, unknown>>(
      '/payroll/employees',
      body,
    );
    return res.employee ?? res;
  }

  getPayslips(employeeId?: string): Promise<{ payslips: unknown[] }> {
    const path = employeeId
      ? `/payroll/payslips?employee_id=${encodeURIComponent(employeeId)}`
      : '/payroll/payslips';
    return this.http.get<{ payslips: unknown[] }>(path);
  }

  async createPayslip(body: Record<string, unknown>): Promise<unknown> {
    const res = await this.http.post<{ payslip?: unknown } & Record<string, unknown>>(
      '/payroll/payslips',
      body,
    );
    return res.payslip ?? res;
  }
}
