import type { EmitInvoiceInput, Invoice } from '../../domain/entities/Invoice';
import type { DownloadInvoicePdf } from '../../domain/usecases/DownloadInvoicePdf';
import type { EmitInvoice } from '../../domain/usecases/EmitInvoice';
import type { ListInvoices } from '../../domain/usecases/ListInvoices';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type InvoiceState = {
  status: LoadStatus;
  invoices: Invoice[];
  error: string | null;
  saving: boolean;
  downloadingId: string | null;
};

type Deps = {
  listInvoices: ListInvoices;
  emitInvoice: EmitInvoice;
  downloadPdf: DownloadInvoicePdf;
};

export function createInvoiceStore(deps: Deps) {
  let state: InvoiceState = {
    status: 'idle',
    invoices: [],
    error: null,
    saving: false,
    downloadingId: null,
  };
  const listeners = new Set<(s: InvoiceState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<InvoiceState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: InvoiceState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): InvoiceState {
      return state;
    },
    async load(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const invoices = await deps.listInvoices.execute();
        set({
          invoices,
          status: invoices.length ? 'success' : 'empty',
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al cargar facturas',
        });
      }
    },
    async emitInvoice(input: EmitInvoiceInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.emitInvoice.execute(input);
        set({ saving: false });
        await this.load();
      } catch (err) {
        set({
          saving: false,
          error: err instanceof Error ? err.message : 'Error al emitir factura',
        });
        throw err;
      }
    },
    async downloadPdf(id: string): Promise<void> {
      set({ downloadingId: id, error: null });
      try {
        const blob = await deps.downloadPdf.execute(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${id.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        set({ downloadingId: null });
      } catch (err) {
        set({
          downloadingId: null,
          error: err instanceof Error ? err.message : 'Error al descargar PDF',
        });
        throw err;
      }
    },
  };
}

export type InvoiceStore = ReturnType<typeof createInvoiceStore>;
