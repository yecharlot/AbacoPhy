import type { EmitInvoiceInput, Invoice } from '../../domain/entities/Invoice';
import type { ListInvoices } from '../../domain/usecases/ListInvoices';
import type { EmitInvoice } from '../../domain/usecases/EmitInvoice';
import type { DownloadInvoicePdf } from '../../domain/usecases/DownloadInvoicePdf';

export type InvoicingStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type InvoicingState = {
  status: InvoicingStatus;
  invoices: Invoice[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  listInvoices: ListInvoices;
  emitInvoice: EmitInvoice;
  downloadPdf: DownloadInvoicePdf;
};

export function createInvoicingStore(deps: Deps) {
  let state: InvoicingState = {
    status: 'idle',
    invoices: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: InvoicingState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<InvoicingState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: InvoicingState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): InvoicingState {
      return state;
    },
    async load(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const invoices = await deps.listInvoices.execute();
        set({
          status: invoices.length ? 'success' : 'empty',
          invoices,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar facturas';
        set({ status: 'error', error: message });
      }
    },
    async emit(input: EmitInvoiceInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.emitInvoice.execute(input);
        set({ saving: false });
        await this.load();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al emitir factura';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async downloadPdf(id: string, number: string): Promise<void> {
      try {
        const blob = await deps.downloadPdf.execute(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al descargar PDF';
        set({ error: message });
        throw err;
      }
    },
  };
}

export type InvoicingStore = ReturnType<typeof createInvoicingStore>;
