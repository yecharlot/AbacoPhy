import type { InvoicingRepository } from '../repositories/InvoicingRepository';

export class DownloadInvoicePdf {
  constructor(private readonly repo: InvoicingRepository) {}

  execute(id: string): Promise<Blob> {
    if (!id) throw new Error('Factura no válida');
    return this.repo.getInvoicePdf(id);
  }
}
