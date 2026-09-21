import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { Payslip } from '../entities/Payslip';

export class CreatePayslip {
  constructor(private repository: PayrollRepository) {}

  async execute(payslip: Omit<Payslip, 'id' | 'dateEmitted'>): Promise<Payslip> {
    return this.repository.createPayslip(payslip);
  }
}
