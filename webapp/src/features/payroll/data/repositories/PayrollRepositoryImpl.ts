import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type {
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
} from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip } from '../../domain/entities/Payslip';
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
      return (res.employees || []).map((row) =>
        payrollMapper.toEmployee(row as Parameters<typeof payrollMapper.toEmployee>[0]),
      );
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    try {
      const dto = await this.remote.createEmployee(payrollMapper.toEmployeeDto(input));
      return payrollMapper.toEmployee(dto as Parameters<typeof payrollMapper.toEmployee>[0]);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async updateEmployee(input: UpdateEmployeeInput): Promise<Employee> {
    try {
      const dto = await this.remote.updateEmployee(payrollMapper.toUpdateEmployeeDto(input));
      return payrollMapper.toEmployee(dto as Parameters<typeof payrollMapper.toEmployee>[0]);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async deactivateEmployee(id: string): Promise<void> {
    try {
      await this.remote.deactivateEmployee(id);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getPayslips(employeeId?: string): Promise<Payslip[]> {
    try {
      const res = await this.remote.getPayslips(employeeId);
      return (res.payslips || []).map((row) =>
        payrollMapper.toPayslip(row as Parameters<typeof payrollMapper.toPayslip>[0]),
      );
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createPayslip(input: CreatePayslipInput): Promise<Payslip> {
    try {
      const dto = await this.remote.createPayslip(payrollMapper.toPayslipDto(input));
      return payrollMapper.toPayslip(dto as Parameters<typeof payrollMapper.toPayslip>[0]);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getPayrollPdf(period: string): Promise<Blob> {
    try {
      return await this.remote.getPdf(period);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
