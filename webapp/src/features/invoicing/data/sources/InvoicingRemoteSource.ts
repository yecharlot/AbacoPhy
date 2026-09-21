import type { HttpClient } from '../../../../infrastructure/data/http';
import type { InvoiceDto } from '../dto/InvoiceDto';

export class InvoicingRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getInvoices(): Promise<{ invoices: InvoiceDto[] }> {
    return this.http.get<{ invoices: InvoiceDto[] }>('/invoices');
  }

  emitInvoice(body: Partial<InvoiceDto>): Promise<InvoiceDto> {
    return this.http.post<InvoiceDto>('/invoices', body);
  }

  getPdf(id: string): Promise<Blob> {
    return this.http.getBlob(`/invoices/pdf?id=${encodeURIComponent(id)}`);
  }
}
