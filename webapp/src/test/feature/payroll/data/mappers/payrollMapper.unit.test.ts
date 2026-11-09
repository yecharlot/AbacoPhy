import { describe, expect, it } from 'vitest';
import { payrollMapper } from '../../../../../features/payroll/data/mappers/payrollMapper';

describe('payrollMapper.toPayslipDto', () => {
  it('envía el identificador y los campos funcionales sin serializar metadata', () => {
    const dto = payrollMapper.toPayslipDto({
      employeeId: '  employee-123  ',
      period: '2026-11',
      otherDeduct: 0,
      metadata: '{"employeeId":"employee-123","period":"2026-11"}',
    });

    expect(dto).toEqual({
      employee_id: 'employee-123',
      period: '2026-11',
      gross: undefined,
      other_deductions: 0,
    });
    expect(dto).not.toHaveProperty('metadata');
  });
});
