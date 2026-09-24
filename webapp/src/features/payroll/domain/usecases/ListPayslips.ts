import type { Payslip } from '../entities/Payslip';
import type { PayrollRepository } from '../repositories/PayrollRepository';

export class ListPayslips {
  constructor(private readonly repo: PayrollRepository) {}

  execute(employeeId?: string): Promise<Payslip[]> {
    return this.repo.getPayslips(employeeId);
  }
}
