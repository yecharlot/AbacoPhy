import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { Payslip } from '../entities/Payslip';

export class ListPayslips {
  constructor(private repository: PayrollRepository) {}

  async execute(employeeId?: string): Promise<Payslip[]> {
    return this.repository.getPayslips(employeeId);
  }
}
