import type { InvoicingRepository } from '../repositories/InvoicingRepository';
import type { Invoice } from '../entities/Invoice';

export class ListInvoices {
  constructor(private repository: InvoicingRepository) {}

  async execute(): Promise<Invoice[]> {
    return this.repository.getInvoices();
  }
}
