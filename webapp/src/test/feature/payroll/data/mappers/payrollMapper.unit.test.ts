import { describe, expect, it } from 'vitest';
import { payrollMapper } from '../../../../../features/payroll/data/mappers/payrollMapper';

describe('payrollMapper.toPayslipDto', () => {
  it('envía metadata como objeto JSON compatible con el backend', () => {
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
      metadata: {
        employeeId: 'employee-123',
        period: '2026-11',
      },
    });
    expect(typeof dto.metadata).toBe('object');
  });
});
