import type { EmitInvoiceInput, Invoice } from '../entities/Invoice';

export interface InvoicingRepository {
  getInvoices(): Promise<Invoice[]>;
  emitInvoice(input: EmitInvoiceInput): Promise<Invoice>;
  getInvoicePdf(id: string): Promise<Blob>;
}
