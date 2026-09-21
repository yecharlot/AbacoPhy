import type { Product } from '../../../catalog/domain/entities/Product';
import type { GetProducts } from '../../../catalog/domain/usecases';
import type {
  CreateOnlineOrderInput,
  OnlineOrder,
  OrderStatus,
} from '../../domain/entities/OnlineOrder';
import type { CreateOnlineOrder, ListOnlineOrders, UpdateOrderStatus } from '../../domain/usecases';

export type CommerceStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type CommerceState = {
  status: CommerceStatus;
  orders: OnlineOrder[];
  products: Product[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  listOrders: ListOnlineOrders;
  createOrder: CreateOnlineOrder;
  updateStatus: UpdateOrderStatus;
  getProducts: GetProducts;
};

export function createCommerceStore(deps: Deps) {
  let state: CommerceState = {
    status: 'idle',
    orders: [],
    products: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: CommerceState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<CommerceState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }

  return {
    subscribe(fn: (s: CommerceState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): CommerceState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [orders, products] = await Promise.all([
          deps.listOrders.execute(),
          deps.getProducts.execute().catch(() => [] as Product[]),
        ]);
        set({ status: orders.length ? 'success' : 'empty', orders, products, error: null });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar los pedidos online') });
      }
    },
    async addOrder(input: CreateOnlineOrderInput): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createOrder.execute(input);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al registrar el pedido') });
        throw err;
      }
    },
    async changeStatus(id: string, status: OrderStatus): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.updateStatus.execute(id, status);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al actualizar el pedido') });
        throw err;
      }
    },
  };
}

export type CommerceStore = ReturnType<typeof createCommerceStore>;
