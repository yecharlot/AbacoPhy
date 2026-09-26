import type { AppContainer } from '../../../infrastructure/di';
import type { CatalogRepository } from '../../catalog/domain/repositories/CatalogRepository';
import { GetProducts } from '../../catalog/domain/usecases';
import type { WarehouseRepository } from '../../warehouse/domain/repositories/WarehouseRepository';
import { GetSalesUnits, GetWarehouseStock } from '../../warehouse/domain/usecases';
import { SalesRepositoryImpl } from '../data/repositories/SalesRepositoryImpl';
import { ListSales, RegisterSale } from '../domain/usecases';
import { createPosStore, type PosStore } from '../ui/stores/posStore';

export type PosModule = {
  posStore: PosStore;
};

export type PosModuleDeps = {
  catalog: CatalogRepository;
  warehouse: WarehouseRepository;
};

export function createPosModule(container: AppContainer, deps: PosModuleDeps): PosModule {
  const repo = new SalesRepositoryImpl(container.http);

  const posStore = createPosStore({
    listSales: new ListSales(repo),
    registerSale: new RegisterSale(repo),
    getProducts: new GetProducts(deps.catalog),
    getSalesUnits: new GetSalesUnits(deps.warehouse),
    getWarehouseStock: new GetWarehouseStock(deps.warehouse),
    appDataBus: container.appDataBus,
  });

  return { posStore };
}
