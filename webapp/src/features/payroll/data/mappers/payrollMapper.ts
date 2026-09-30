import type { CreateEmployeeInput, Employee, UpdateEmployeeInput } from '../../domain/entities/Employee';
import type { CreatePayslipInput, Payslip } from '../../domain/entities/Payslip';
import {
  normalizeMetadataField,
  metadataToApiObject,
  metadataToDto,
  readMetadata,
} from '../../../../infrastructure/domain/metadata';

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type EmployeeDto = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  ci?: string;
  identity_card?: string;
  role?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  hiring_date?: string;
  salary?: number;
  salary_base?: number;
  currency?: string;
  vac_rate?: number;
  ss_employer_rate?: number;
  ss_worker_rate?: number;
  active?: boolean;
  unit_ids?: string[];
  metadata?: string | null;

};

type PayslipDto = {
  id?: string;
  employee_id?: string;
  employee_name?: string;
  period?: string;
  period_start?: string;
  period_end?: string;
  gross?: number;
  base_amount?: number;
  vacation_prov?: number;
  ss_employer?: number;
  ss_worker?: number;
  other_deductions?: number;
  deductions?: number;
  net?: number;
  total_net?: number;
  employer_cost?: number;
  currency?: string;
  status?: string;
  created_at?: string;
  date_emitted?: string;
  metadata?: string | null;

};

export const payrollMapper = {
  toEmployee(dto: EmployeeDto): Employee {
    const name =
      dto.name ||
      [dto.first_name, dto.last_name].filter(Boolean).join(' ').trim() ||
      '';
    const metaStr = normalizeMetadataField(dto);
    const metaMap = readMetadata(dto);
    // unitIds solo viven en metadata (Go no tiene unit_ids en Employee)
    let unitIds: string[] = [];
    if (Array.isArray(metaMap.unitIds)) {
      unitIds = metaMap.unitIds.map(String);
    } else if (Array.isArray(dto.unit_ids)) {
      unitIds = dto.unit_ids.map(String);
    }
    return {
      id: dto.id || '',
      name,
      ci: dto.ci || dto.identity_card || '',
      role: dto.role || dto.position || '',
      department: dto.department || '',
      hireDate: dto.hire_date || dto.hiring_date || '',
      salary: n(dto.salary ?? dto.salary_base),
      currency: dto.currency || 'CUP',
      vacRate: n(dto.vac_rate) || 0.09,
      ssEmployerRate: n(dto.ss_employer_rate) || 0.125,
      ssWorkerRate: n(dto.ss_worker_rate) || 0.05,
      active: dto.active !== false,
      unitIds,
      metadata: metaStr,
    };
  },

  toUpdateEmployeeDto(input: UpdateEmployeeInput): Record<string, unknown> {
    const body: Record<string, unknown> = { id: input.id };
    if (input.name !== undefined) body.name = input.name;
    if (input.ci !== undefined) body.ci = input.ci;
    if (input.role !== undefined) body.role = input.role;
    if (input.department !== undefined) body.department = input.department;
    if (input.hireDate !== undefined) body.hire_date = input.hireDate;
    if (input.salary !== undefined) body.salary = input.salary;
    if (input.currency !== undefined) body.currency = input.currency;
    if (input.vacRate !== undefined) body.vac_rate = input.vacRate;
    if (input.ssEmployerRate !== undefined) body.ss_employer_rate = input.ssEmployerRate;
    if (input.ssWorkerRate !== undefined) body.ss_worker_rate = input.ssWorkerRate;
    if (input.active !== undefined) body.active = input.active;
    // NUNCA unit_ids: DisallowUnknownFields en backend
    const metaObj = metadataToApiObject(input);
    if (metaObj) body.metadata = metaObj;
    return body;
  },

  toEmployeeDto(input: CreateEmployeeInput): Record<string, unknown> {
    // Solo campos del struct domain.Employee (Go).
    // unit_ids NO existe → DisallowUnknownFields rechaza el body entero
    // y el handler responde genérico «nombre del trabajador requerido».
    const name = (input.name || '').trim();
    const body: Record<string, unknown> = {
      name,
      salary: input.salary,
      currency: (input.currency || 'CUP').trim() || 'CUP',
      vac_rate: input.vacRate ?? 0.09,
      ss_employer_rate: input.ssEmployerRate ?? 0.125,
      ss_worker_rate: input.ssWorkerRate ?? 0.05,
    };
    if (input.ci) body.ci = input.ci;
    if (input.role) body.role = input.role;
    if (input.department) body.department = input.department;
    if (input.hireDate) body.hire_date = input.hireDate;
    // Metadata como objeto (map[string]any), no string JSON
    const metaObj = metadataToApiObject(input);
    if (metaObj) body.metadata = metaObj;
    return body;
  },

  toPayslip(dto: PayslipDto): Payslip {
    const period =
      dto.period ||
      (dto.period_start && dto.period_end
        ? `${dto.period_start} → ${dto.period_end}`
        : dto.period_start || '');
    return {
      id: dto.id || '',
      employeeId: dto.employee_id || '',
      employeeName: dto.employee_name || '',
      period,
      gross: n(dto.gross ?? dto.base_amount),
      vacationProv: n(dto.vacation_prov),
      ssEmployer: n(dto.ss_employer),
      ssWorker: n(dto.ss_worker),
      otherDeduct: n(dto.other_deductions),
      deductions: n(dto.deductions),
      net: n(dto.net ?? dto.total_net),
      employerCost: n(dto.employer_cost),
      currency: dto.currency || 'CUP',
      status: dto.status || '',
      createdAt: dto.created_at || dto.date_emitted || '',
      metadata: normalizeMetadataField(dto),

    };
  },

  toPayslipDto(input: CreatePayslipInput): Record<string, unknown> {
    return {
      employee_id: input.employeeId,
      period: input.period || undefined,
      gross: input.gross ?? undefined,
      other_deductions: input.otherDeduct ?? 0,
      metadata: metadataToDto(input),

    };
  },
};
