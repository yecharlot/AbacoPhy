import type { CreatePayslipInput, Payslip } from '../entities/Payslip';
import type { PayrollRepository } from '../repositories/PayrollRepository';

const PERIOD_RE = /^\d{4}-\d{2}$/;

export class CreatePayslip {
  constructor(private readonly repo: PayrollRepository) {}

  async execute(input: CreatePayslipInput): Promise<Payslip> {
    if (!input.employeeId) throw new Error('Seleccione un trabajador');
    if (!PERIOD_RE.test(input.period)) throw new Error('Periodo inválido (use YYYY-MM)');
    if (!(input.gross > 0)) throw new Error('El bruto debe ser mayor que 0');
    const deductions = input.deductions ?? 0;
    if (deductions < 0) throw new Error('Las deducciones no pueden ser negativas');
    // Tasas / cálculo legal: backend. Cliente solo valida y envía.
    return this.repo.createPayslip({
      ...input,
      deductions,
      status: input.status ?? 'paid',
    });
  }
}
