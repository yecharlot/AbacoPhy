import type { Invoice } from '../entities/Invoice';
import type { InvoiceRepository } from '../repositories/InvoiceRepository';

export class ListInvoices {
  constructor(private readonly repo: InvoiceRepository) {}

  execute(): Promise<Invoice[]> {
    return this.repo.list();
  }
}
