import type { AppContainer } from '../../../infrastructure/di';
import type { CatalogRepository } from '../../catalog/domain/repositories/CatalogRepository';
import { GetProducts } from '../../catalog/domain/usecases';
import { CommerceRepositoryImpl } from '../data/repositories/CommerceRepositoryImpl';
import { CreateOnlineOrder, ListOnlineOrders, UpdateOrderStatus } from '../domain/usecases';
import { createCommerceStore, type CommerceStore } from '../ui/stores/commerceStore';

export type CommerceModule = {
  commerceStore: CommerceStore;
};

export type CommerceModuleDeps = {
  catalog: CatalogRepository;
};

export function createCommerceModule(
  container: AppContainer,
  deps: CommerceModuleDeps,
): CommerceModule {
  const repo = new CommerceRepositoryImpl(container.http);

  const commerceStore = createCommerceStore({
    listOrders: new ListOnlineOrders(repo),
    createOrder: new CreateOnlineOrder(repo),
    updateStatus: new UpdateOrderStatus(repo),
    getProducts: new GetProducts(deps.catalog),
  });

  return { commerceStore };
}
