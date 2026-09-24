import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { CreatePayslipInput, Payslip } from '../entities/Payslip';

export class CreatePayslip {
  constructor(private repository: PayrollRepository) {}

  async execute(input: CreatePayslipInput): Promise<Payslip> {
    return this.repository.createPayslip(input);
  }
}
