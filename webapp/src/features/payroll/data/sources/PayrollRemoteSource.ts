import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  CreateEmployeeRequestDto,
  CreatePayslipRequestDto,
  EmployeeDto,
  EmployeesResponseDto,
  PayslipDto,
  PayslipsResponseDto,
} from '../dto/PayrollDto';

export class PayrollRemoteSource {
  constructor(private readonly http: HttpClient) {}

  listEmployees(): Promise<EmployeesResponseDto> {
    return this.http.get<EmployeesResponseDto>('/payroll/employees');
  }

  createEmployee(body: CreateEmployeeRequestDto): Promise<EmployeeDto> {
    return this.http.post<EmployeeDto>('/payroll/employees', body);
  }

  listPayslips(): Promise<PayslipsResponseDto> {
    return this.http.get<PayslipsResponseDto>('/payroll/payslips');
  }

  createPayslip(body: CreatePayslipRequestDto): Promise<PayslipDto> {
    return this.http.post<PayslipDto>('/payroll/payslips', body);
  }

  downloadPdf(period: string): Promise<Blob> {
    const q = encodeURIComponent(period);
    return this.http.getBlob(`/payroll/pdf?period=${q}`);
  }
}
