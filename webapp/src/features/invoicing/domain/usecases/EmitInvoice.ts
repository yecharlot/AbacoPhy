import type { InvoicingRepository } from '../repositories/InvoicingRepository';
import type { Invoice } from '../entities/Invoice';

export class EmitInvoice {
  constructor(private repository: InvoicingRepository) {}

  async execute(invoice: Omit<Invoice, 'id' | 'number' | 'status'>): Promise<Invoice> {
    return this.repository.emitInvoice(invoice);
  }
}
