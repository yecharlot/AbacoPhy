import type { InvoicingRepository } from '../repositories/InvoicingRepository';
import type { EmitInvoiceInput, Invoice } from '../entities/Invoice';

export class EmitInvoice {
  constructor(private repository: InvoicingRepository) {}

  async execute(input: EmitInvoiceInput): Promise<Invoice> {
    return this.repository.emitInvoice(input);
  }
}
