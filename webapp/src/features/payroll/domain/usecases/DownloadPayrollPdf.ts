import type { PayrollRepository } from '../repositories/PayrollRepository';

/** Placeholder: el backend aún no expone PDF de nómina de forma uniforme. */
export class DownloadPayrollPdf {
  constructor(private readonly repository: PayrollRepository) {}

  execute(period: string): Promise<Blob> {
    if (!period) throw new Error('Período de nómina no válido');
    return this.repository.getPayrollPdf(period);
  }
}
