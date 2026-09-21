import type { Payslip } from '../entities/Payslip';
import type { PayrollRepository } from '../repositories/PayrollRepository';

export class ListPayslips {
  constructor(private readonly repo: PayrollRepository) {}
  execute(): Promise<Payslip[]> {
    return this.repo.listPayslips();
  }
}
