import type { Invoice } from '../entities/Invoice';

export interface InvoicingRepository {
  getInvoices(): Promise<Invoice[]>;
  emitInvoice(invoice: Omit<Invoice, 'id' | 'number' | 'status'>): Promise<Invoice>;
  getInvoicePdf(id: string): Promise<Blob>;
}
