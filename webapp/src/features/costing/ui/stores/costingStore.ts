import type { Product } from '../../../catalog/domain/entities/Product';
import type { GetProducts } from '../../../catalog/domain/usecases';
import type { CostSheet, SaveCostSheetInput } from '../../domain/entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../../domain/entities/PriceSheet';
import type {
  DeleteCostSheet,
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
  deleteCostSheet: DeleteCostSheet;
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

  async function loadAll(): Promise<void> {
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
    loadAll,

    async saveCostSheet(input: SaveCostSheetInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        const saved = await deps.saveCostSheet.execute(input);
        // Merge optimista: visible de inmediato aunque el GET tarde o falle
        const rest = state.costSheets.filter(
          (c) => c.productId !== saved.productId && c.id !== saved.id,
        );
        set({
          saving: false,
          costSheets: [saved, ...rest],
          status: 'success',
          error: null,
        });
        await loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al guardar la ficha de costo') });
        throw err;
      }
    },

    async removeCostSheet(productId: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.deleteCostSheet.execute(productId);
        set({
          saving: false,
          costSheets: state.costSheets.filter((c) => c.productId !== productId),
        });
        await loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al eliminar la ficha de costo') });
        throw err;
      }
    },

    async savePriceSheet(input: SavePriceSheetInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        const saved = await deps.savePriceSheet.execute(input);
        const rest = state.priceSheets.filter(
          (p) => p.productId !== saved.productId && p.id !== saved.id,
        );
        set({
          saving: false,
          priceSheets: [saved, ...rest],
          status: 'success',
          error: null,
        });
        await loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al guardar la ficha de precio') });
        throw err;
      }
    },

    async removePriceSheet(id: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.deletePriceSheet.execute(id);
        set({
          saving: false,
          priceSheets: state.priceSheets.filter((p) => p.id !== id),
        });
        await loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al eliminar la ficha de precio') });
        throw err;
      }
    },
  };
}

export type CostingStore = ReturnType<typeof createCostingStore>;
