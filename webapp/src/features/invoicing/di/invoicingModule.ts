import type { AppContainer } from '../../../infrastructure/di';
import { InvoicingRepositoryImpl } from '../data/repositories/InvoicingRepositoryImpl';
import { ListInvoices } from '../domain/usecases/ListInvoices';
import { EmitInvoice } from '../domain/usecases/EmitInvoice';
import { DownloadInvoicePdf } from '../domain/usecases/DownloadInvoicePdf';
import { createInvoicingStore } from '../ui/stores/invoicingStore';

export function createInvoicingModule(container: AppContainer) {
  const repository = new InvoicingRepositoryImpl(container.http);

  const listInvoices = new ListInvoices(repository);
  const emitInvoice = new EmitInvoice(repository);
  const downloadPdf = new DownloadInvoicePdf(repository);

  const invoicingStore = createInvoicingStore({
    listInvoices,
    emitInvoice,
    downloadPdf,
  });

  return {
    invoicingStore,
  };
}
