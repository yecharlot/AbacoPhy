import type { InvoiceRepository } from '../repositories/InvoiceRepository';

export class DownloadInvoicePdf {
  constructor(private readonly repo: InvoiceRepository) {}

  execute(id: string): Promise<Blob> {
    if (!id) throw new Error('Factura no válida');
    return this.repo.downloadPdf(id);
  }
}
