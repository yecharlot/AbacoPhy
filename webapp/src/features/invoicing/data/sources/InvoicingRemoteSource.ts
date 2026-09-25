import type { HttpClient } from '../../../../infrastructure/data/http';

export class InvoicingRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getInvoices(): Promise<{ invoices: unknown[] }> {
    return this.http.get<{ invoices: unknown[] }>('/invoices');
  }

  async emitInvoice(body: Record<string, unknown>): Promise<unknown> {
    const res = await this.http.post<{ factura?: unknown } & Record<string, unknown>>(
      '/invoices',
      body,
    );
    return res.factura ?? res;
  }

  getPdf(id: string): Promise<Blob> {
    return this.http.getBlob(`/invoices/pdf?id=${encodeURIComponent(id)}`);
  }
}
