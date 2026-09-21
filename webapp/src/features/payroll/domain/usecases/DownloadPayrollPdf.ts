import type { PayrollRepository } from '../repositories/PayrollRepository';

export class DownloadPayrollPdf {
  constructor(private readonly repo: PayrollRepository) {}

  execute(period: string): Promise<Blob> {
    const p = period.trim() || 'all';
    return this.repo.downloadPdf(p);
  }
}
