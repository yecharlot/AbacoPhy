import type { EmitInvoiceInput, EmitInvoiceResult, Invoice } from '../entities/Invoice';

export interface InvoiceRepository {
  list(): Promise<Invoice[]>;
  emit(input: EmitInvoiceInput): Promise<EmitInvoiceResult>;
  /** Returns raw PDF bytes for the given invoice id. */
  downloadPdf(id: string): Promise<Blob>;
}
