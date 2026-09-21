import type { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/Product';
import type { MeasureUnit, CreateMeasureUnitInput } from '../../domain/entities/MeasureUnit';
import type { Currency } from '../../domain/entities/Currency';
import type { GetProducts, CreateProduct, UpdateProduct, GetMeasureUnits, CreateMeasureUnit, DeleteMeasureUnit, GetCurrencies } from '../../domain/usecases';

export type CatalogStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type CatalogState = {
  status: CatalogStatus;
  products: Product[];
  measureUnits: MeasureUnit[];
  currencies: Currency[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  getProducts: GetProducts;
  createProduct: CreateProduct;
  updateProduct: UpdateProduct;
  getMeasureUnits: GetMeasureUnits;
  createMeasureUnit: CreateMeasureUnit;
  deleteMeasureUnit: DeleteMeasureUnit;
  getCurrencies: GetCurrencies;
};

export function createCatalogStore(deps: Deps) {
  let state: CatalogState = {
    status: 'idle',
    products: [],
    measureUnits: [],
    currencies: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: CatalogState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<CatalogState>) {
    state = { ...state, ...partial };
    emit();
  }

  return {
    subscribe(fn: (s: CatalogState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): CatalogState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [products, measureUnits, currencies] = await Promise.all([
          deps.getProducts.execute(),
          deps.getMeasureUnits.execute().catch(() => []),
          deps.getCurrencies.execute().catch(() => []),
        ]);
        set({
          status: products.length || measureUnits.length ? 'success' : 'empty',
          products,
          measureUnits,
          currencies,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar el catálogo';
        set({ status: 'error', error: message });
      }
    },
    async addProduct(input: CreateProductInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createProduct.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar producto';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async editProduct(input: UpdateProductInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.updateProduct.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al modificar producto';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async addMeasureUnit(input: CreateMeasureUnitInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createMeasureUnit.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al agregar unidad de medida';
        set({ saving: false, error: message });
        throw err;
      }
    },
    async removeMeasureUnit(id: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.deleteMeasureUnit.execute(id);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar unidad de medida';
        set({ saving: false, error: message });
        throw err;
      }
    },
  };
}

export type CatalogStore = ReturnType<typeof createCatalogStore>;
