import type { Product } from '../../../catalog/domain/entities/Product';
import type { GetProducts } from '../../../catalog/domain/usecases';
import type { SalesUnit } from '../../../warehouse/domain/entities/SalesUnit';
import type { GetSalesUnits } from '../../../warehouse/domain/usecases';
import type { CreateSaleInput, Sale } from '../../domain/entities/Sale';
import type { ListSales, RegisterSale } from '../../domain/usecases';

export type PosStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type PosState = {
  status: PosStatus;
  sales: Sale[];
  products: Product[];
  units: SalesUnit[];
  lastSale: Sale | null;
  error: string | null;
  saving: boolean;
};

type Deps = {
  listSales: ListSales;
  registerSale: RegisterSale;
  getProducts: GetProducts;
  getSalesUnits: GetSalesUnits;
};

export function createPosStore(deps: Deps) {
  let state: PosState = {
    status: 'idle',
    sales: [],
    products: [],
    units: [],
    lastSale: null,
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: PosState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<PosState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }

  return {
    subscribe(fn: (s: PosState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): PosState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [sales, products, unitsSnapshot] = await Promise.all([
          deps.listSales.execute(),
          deps.getProducts.execute().catch(() => [] as Product[]),
          deps.getSalesUnits.execute().catch(() => ({ units: [] as SalesUnit[], stocks: [] })),
        ]);
        set({
          status: sales.length ? 'success' : 'empty',
          sales,
          products,
          units: unitsSnapshot.units,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar el punto de venta') });
      }
    },
    async registerSale(input: CreateSaleInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        const sale = await deps.registerSale.execute(input);
        set({ saving: false, lastSale: sale });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al registrar la venta') });
        throw err;
      }
    },
  };
}

export type PosStore = ReturnType<typeof createPosStore>;
