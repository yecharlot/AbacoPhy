import type { EmployeeDto, PayslipDto } from '../dto/PayrollDto';
import type { Employee } from '../../domain/entities/Employee';
import type { Payslip } from '../../domain/entities/Payslip';

export const payrollMapper = {
  toEmployee(dto: EmployeeDto): Employee {
    return {
      id: dto.id,
      code: dto.code,
      firstName: dto.first_name,
      lastName: dto.last_name,
      identityCard: dto.identity_card,
      position: dto.position,
      salaryBase: dto.salary_base,
      currency: dto.currency,
      hiringDate: dto.hiring_date,
      active: dto.active,
    };
  },

  toEmployeeDto(entity: Omit<Employee, 'id' | 'active'>): Partial<EmployeeDto> {
    return {
      code: entity.code,
      first_name: entity.firstName,
      last_name: entity.lastName,
      identity_card: entity.identityCard,
      position: entity.position,
      salary_base: entity.salaryBase,
      currency: entity.currency,
      hiring_date: entity.hiringDate,
    };
  },

  toPayslip(dto: PayslipDto): Payslip {
    return {
      id: dto.id,
      employeeId: dto.employee_id,
      employeeName: dto.employee_name,
      periodStart: dto.period_start,
      periodEnd: dto.period_end,
      baseAmount: dto.base_amount,
      bonus: dto.bonus,
      deductions: dto.deductions,
      totalNet: dto.total_net,
      currency: dto.currency,
      dateEmitted: dto.date_emitted,
    };
  },

  toPayslipDto(entity: Omit<Payslip, 'id' | 'dateEmitted'>): Partial<PayslipDto> {
    return {
      employee_id: entity.employeeId,
      period_start: entity.periodStart,
      period_end: entity.periodEnd,
      base_amount: entity.baseAmount,
      bonus: entity.bonus,
      deductions: entity.deductions,
      total_net: entity.totalNet,
      currency: entity.currency,
    };
  },
};
