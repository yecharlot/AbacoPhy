import type { InvoicingRepository } from '../repositories/InvoicingRepository';

export class DownloadInvoicePdf {
  constructor(private repository: InvoicingRepository) {}

  async execute(id: string): Promise<Blob> {
    return this.repository.getInvoicePdf(id);
  }
}
