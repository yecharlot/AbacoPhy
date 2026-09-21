import type { Product } from '../../../catalog/domain/entities/Product';
import type { GetProducts } from '../../../catalog/domain/usecases';
import type { CostSheet, SaveCostSheetInput } from '../../domain/entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../../domain/entities/PriceSheet';
import type {
  DeletePriceSheet,
  ListCostSheets,
  ListPriceSheets,
  SaveCostSheet,
  SavePriceSheet,
} from '../../domain/usecases';

export type CostingStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type CostingState = {
  status: CostingStatus;
  costSheets: CostSheet[];
  priceSheets: PriceSheet[];
  products: Product[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  listCostSheets: ListCostSheets;
  saveCostSheet: SaveCostSheet;
  listPriceSheets: ListPriceSheets;
  savePriceSheet: SavePriceSheet;
  deletePriceSheet: DeletePriceSheet;
  getProducts: GetProducts;
};

export function createCostingStore(deps: Deps) {
  let state: CostingState = {
    status: 'idle',
    costSheets: [],
    priceSheets: [],
    products: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: CostingState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<CostingState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }

  return {
    subscribe(fn: (s: CostingState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): CostingState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [costSheets, priceSheets, products] = await Promise.all([
          deps.listCostSheets.execute(),
          deps.listPriceSheets.execute().catch(() => [] as PriceSheet[]),
          deps.getProducts.execute().catch(() => [] as Product[]),
        ]);
        set({
          status: costSheets.length || priceSheets.length ? 'success' : 'empty',
          costSheets,
          priceSheets,
          products,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar las fichas') });
      }
    },
    async saveCostSheet(input: SaveCostSheetInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.saveCostSheet.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al guardar la ficha de costo') });
        throw err;
      }
    },
    async savePriceSheet(input: SavePriceSheetInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.savePriceSheet.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al guardar la ficha de precio') });
        throw err;
      }
    },
    async removePriceSheet(id: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.deletePriceSheet.execute(id);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al eliminar la ficha de precio') });
        throw err;
      }
    },
  };
}

export type CostingStore = ReturnType<typeof createCostingStore>;
