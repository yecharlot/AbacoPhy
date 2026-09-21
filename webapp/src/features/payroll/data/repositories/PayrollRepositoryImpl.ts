import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Employee } from '../../domain/entities/Employee';
import type { Payslip } from '../../domain/entities/Payslip';
import type { PayrollRepository } from '../../domain/repositories/PayrollRepository';
import { PayrollRemoteSource } from '../sources/PayrollRemoteSource';
import { payrollMapper } from '../mappers/payrollMapper';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'Error en gestión de nómina';
}

export class PayrollRepositoryImpl implements PayrollRepository {
  private readonly remote: PayrollRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new PayrollRemoteSource(http);
  }

  async getEmployees(): Promise<Employee[]> {
    try {
      const res = await this.remote.getEmployees();
      return (res.employees || []).map(payrollMapper.toEmployee);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createEmployee(employee: Omit<Employee, 'id' | 'active'>): Promise<Employee> {
    try {
      const dto = await this.remote.createEmployee(payrollMapper.toEmployeeDto(employee));
      return payrollMapper.toEmployee(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getPayslips(employeeId?: string): Promise<Payslip[]> {
    try {
      const res = await this.remote.getPayslips(employeeId);
      return (res.payslips || []).map(payrollMapper.toPayslip);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createPayslip(payslip: Omit<Payslip, 'id' | 'dateEmitted'>): Promise<Payslip> {
    try {
      const dto = await this.remote.createPayslip(payrollMapper.toPayslipDto(payslip));
      return payrollMapper.toPayslip(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
