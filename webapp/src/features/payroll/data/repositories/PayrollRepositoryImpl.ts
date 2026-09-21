import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { CreateEmployeeInput, Employee } from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip } from '../../domain/entities/Payslip';
import type { PayrollRepository } from '../../domain/repositories/PayrollRepository';
import {
  createEmployeeToDto,
  createPayslipToDto,
  employeeDtoToEntity,
  payslipDtoToEntity,
} from '../mappers/payrollMapper';
import { PayrollRemoteSource } from '../sources/PayrollRemoteSource';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class PayrollRepositoryImpl implements PayrollRepository {
  private readonly remote: PayrollRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new PayrollRemoteSource(http);
  }

  async listEmployees(): Promise<Employee[]> {
    try {
      const dto = await this.remote.listEmployees();
      const raw = dto.employees ?? dto.trabajadores ?? [];
      return raw.map(employeeDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    try {
      const dto = await this.remote.createEmployee(createEmployeeToDto(input));
      return employeeDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async listPayslips(): Promise<Payslip[]> {
    try {
      const dto = await this.remote.listPayslips();
      const raw = dto.payslips ?? dto.liquidaciones ?? [];
      return raw.map(payslipDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createPayslip(input: CreatePayslipInput): Promise<Payslip> {
    try {
      const dto = await this.remote.createPayslip(createPayslipToDto(input));
      return payslipDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async downloadPdf(period: string): Promise<Blob> {
    try {
      return await this.remote.downloadPdf(period);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
