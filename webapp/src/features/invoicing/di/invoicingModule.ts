import type { AppContainer } from '../../../infrastructure/di';
import { InvoiceRepositoryImpl } from '../data/repositories/InvoiceRepositoryImpl';
import { DownloadInvoicePdf, EmitInvoice, ListInvoices } from '../domain/usecases';
import { createInvoiceStore, type InvoiceStore } from '../ui/stores/invoiceStore';

export type InvoicingModule = {
  invoiceStore: InvoiceStore;
};

export function createInvoicingModule(container: AppContainer): InvoicingModule {
  const repo = new InvoiceRepositoryImpl(container.http);
  const listInvoices = new ListInvoices(repo);
  const emitInvoice = new EmitInvoice(repo);
  const downloadPdf = new DownloadInvoicePdf(repo);

  const invoiceStore = createInvoiceStore({
    listInvoices,
    emitInvoice,
    downloadPdf,
  });

  return { invoiceStore };
}
