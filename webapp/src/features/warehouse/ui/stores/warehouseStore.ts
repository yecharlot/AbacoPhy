import type { Product } from '../../../catalog/domain/entities/Product';
import type { GetProducts } from '../../../catalog/domain/usecases';
import type { UnitStockRow, WarehouseStockRow } from '../../domain/entities/Stock';
import type { CreateSalesUnitInput, SalesUnit } from '../../domain/entities/SalesUnit';
import type {
  CreateReceptionInput,
  EnterReceptionInput,
  Reception,
} from '../../domain/entities/Reception';
import type { CreateTransferInput, Transfer } from '../../domain/entities/Transfer';
import type {
  CreateReception,
  CreateSalesUnit,
  CreateTransfer,
  GetSalesUnits,
  GetWarehouseStock,
  ListReceptions,
  ListTransfers,
} from '../../domain/usecases';

export type WarehouseStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type WarehouseState = {
  status: WarehouseStatus;
  rows: WarehouseStockRow[];
  products: Product[];
  unitStocks: UnitStockRow[];
  units: SalesUnit[];
  receptions: Reception[];
  transfers: Transfer[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  getStock: GetWarehouseStock;
  getProducts: GetProducts;
  getSalesUnits: GetSalesUnits;
  createSalesUnit: CreateSalesUnit;
  listReceptions: ListReceptions;
  createReception: CreateReception;
  listTransfers: ListTransfers;
  createTransfer: CreateTransfer;
};

export function createWarehouseStore(deps: Deps) {
  let state: WarehouseState = {
    status: 'idle',
    rows: [],
    products: [],
    unitStocks: [],
    units: [],
    receptions: [],
    transfers: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: WarehouseState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<WarehouseState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }

  return {
    subscribe(fn: (s: WarehouseState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): WarehouseState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [stock, unitsSnapshot, products, receptions, transfers] = await Promise.all([
          deps.getStock.execute(),
          deps.getSalesUnits.execute(),
          deps.getProducts.execute().catch(() => [] as Product[]),
          deps.listReceptions.execute().catch(() => [] as Reception[]),
          deps.listTransfers.execute().catch(() => [] as Transfer[]),
        ]);
        set({
          status: stock.rows.length || unitsSnapshot.units.length ? 'success' : 'empty',
          rows: stock.rows,
          products,
          unitStocks: unitsSnapshot.stocks.length ? unitsSnapshot.stocks : stock.unitStocks,
          units: unitsSnapshot.units,
          receptions,
          transfers,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar el almacén') });
      }
    },
    async addSalesUnit(input: CreateSalesUnitInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createSalesUnit.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al crear la unidad de venta') });
        throw err;
      }
    },
    async addReception(input: CreateReceptionInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createReception.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al confirmar la recepción') });
        throw err;
      }
    },

    async enterReception(input: EnterReceptionInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.enterReception.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al dar entrada al almacén') });
        throw err;
      }
    },
    async addTransfer(input: CreateTransferInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createTransfer.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al confirmar la transferencia') });
        throw err;
      }
    },
  };
}

export type WarehouseStore = ReturnType<typeof createWarehouseStore>;
