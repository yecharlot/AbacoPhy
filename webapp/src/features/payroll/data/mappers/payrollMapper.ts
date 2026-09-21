import type { CreateEmployeeInput, Employee } from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip, PayslipStatus } from '../../domain/entities/Payslip';
import type {
  CreateEmployeeRequestDto,
  CreatePayslipRequestDto,
  EmployeeDto,
  PayslipDto,
} from '../dto/PayrollDto';

const STATUSES: PayslipStatus[] = ['draft', 'paid', 'cancelled'];

function asStatus(v: string | undefined): PayslipStatus {
  return STATUSES.includes(v as PayslipStatus) ? (v as PayslipStatus) : 'paid';
}

export function employeeDtoToEntity(dto: EmployeeDto): Employee {
  return {
    id: String(dto.id ?? ''),
    name: String(dto.name ?? ''),
    idNumber: String(dto.id_number ?? dto.idNumber ?? ''),
    position: String(dto.position ?? ''),
    salary: Number(dto.salary ?? 0),
    active: dto.active !== false,
  };
}

export function createEmployeeToDto(input: CreateEmployeeInput): CreateEmployeeRequestDto {
  return {
    name: input.name,
    id_number: input.idNumber,
    position: input.position,
    salary: input.salary,
  };
}

export function payslipDtoToEntity(dto: PayslipDto): Payslip {
  const gross = Number(dto.gross ?? 0);
  const deductions = Number(dto.deductions ?? 0);
  return {
    id: String(dto.id ?? ''),
    employeeId: String(dto.employee_id ?? dto.employeeId ?? ''),
    employeeName: dto.employee_name ?? dto.employeeName,
    period: String(dto.period ?? ''),
    gross,
    deductions,
    net: Number(dto.net ?? gross - deductions),
    status: asStatus(dto.status),
  };
}

export function createPayslipToDto(input: CreatePayslipInput): CreatePayslipRequestDto {
  return {
    employee_id: input.employeeId,
    period: input.period,
    gross: input.gross,
    deductions: input.deductions,
    status: input.status ?? 'paid',
  };
}
