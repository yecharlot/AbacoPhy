import type { Invoice } from '../entities/Invoice';
import type { InvoicingRepository } from '../repositories/InvoicingRepository';

export class ListInvoices {
  constructor(private readonly repo: InvoicingRepository) {}

  execute(): Promise<Invoice[]> {
    return this.repo.getInvoices();
  }
}
