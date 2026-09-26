import type { Product } from '../../../catalog/domain/entities/Product';
import type { GetProducts } from '../../../catalog/domain/usecases';
import type {
  SalesUnit,
  UnitStockRowRef,
} from '../../../warehouse/domain/entities/SalesUnit';
import type { WarehouseStockRow } from '../../../warehouse/domain/entities/Stock';
import type { GetSalesUnits } from '../../../warehouse/domain/usecases';
import type { GetWarehouseStock } from '../../../warehouse/domain/usecases/GetWarehouseStock';
import type { CreateSaleInput, Sale } from '../../domain/entities/Sale';
import type { ListSales, RegisterSale } from '../../domain/usecases';

export type PosStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type PosState = {
  status: PosStatus;
  sales: Sale[];
  products: Product[];
  units: SalesUnit[];
  unitStocks: UnitStockRowRef[];
  warehouseRows: WarehouseStockRow[];
  lastSale: Sale | null;
  error: string | null;
  saving: boolean;
};

type Deps = {
  listSales: ListSales;
  registerSale: RegisterSale;
  getProducts: GetProducts;
  getSalesUnits: GetSalesUnits;
  getWarehouseStock?: GetWarehouseStock;
  appDataBus?: {
    on(event: 'ledger.changed' | 'stock.changed', listener: () => void): () => void;
    emit(event: 'ledger.changed' | 'stock.changed'): void;
  };
};

export function createPosStore(deps: Deps) {
  let state: PosState = {
    status: 'idle',
    sales: [],
    products: [],
    units: [],
    unitStocks: [],
    warehouseRows: [],
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

  async function loadAll(): Promise<void> {
    set({ status: 'loading', error: null });
    try {
      const [sales, products, unitsSnapshot, warehouse] = await Promise.all([
        deps.listSales.execute(),
        deps.getProducts.execute().catch(() => [] as Product[]),
        deps.getSalesUnits.execute().catch(() => ({
          units: [] as SalesUnit[],
          stocks: [] as UnitStockRowRef[],
        })),
        deps.getWarehouseStock
          ? deps.getWarehouseStock.execute().catch(() => ({ rows: [], unitStocks: [] }))
          : Promise.resolve({ rows: [] as WarehouseStockRow[], unitStocks: [] }),
      ]);
      set({
        status: sales.length ? 'success' : 'empty',
        sales,
        products,
        units: unitsSnapshot.units,
        unitStocks: unitsSnapshot.stocks ?? [],
        warehouseRows: warehouse.rows ?? [],
        error: null,
      });
    } catch (err) {
      set({ status: 'error', error: messageOf(err, 'Error al cargar el punto de venta') });
    }
  }

  const unsubStock = deps.appDataBus?.on('stock.changed', () => {
    void loadAll();
  });
  const unsubLedger = deps.appDataBus?.on('ledger.changed', () => {
    void loadAll();
  });

  return {
    subscribe(fn: (s: PosState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): PosState {
      return state;
    },
    destroy(): void {
      unsubStock?.();
      unsubLedger?.();
    },
    loadAll,
    async registerSale(input: CreateSaleInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        const sale = await deps.registerSale.execute(input);
        set({ saving: false, lastSale: sale });
        deps.appDataBus?.emit('ledger.changed');
        deps.appDataBus?.emit('stock.changed');
        await loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al registrar la venta') });
        throw err;
      }
    },
  };
}

export type PosStore = ReturnType<typeof createPosStore>;
