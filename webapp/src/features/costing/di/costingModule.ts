import type { AppContainer } from '../../../infrastructure/di';
import type { CatalogRepository } from '../../catalog/domain/repositories/CatalogRepository';
import { CreateProduct, GetMeasureUnits, GetProducts } from '../../catalog/domain/usecases';
import { CostingRepositoryImpl } from '../data/repositories/CostingRepositoryImpl';
import {
  DeleteCostSheet,
  DeletePriceSheet,
  ListCostSheets,
  ListPriceSheets,
  SaveCostSheet,
  SavePriceSheet,
} from '../domain/usecases';
import { createCostingStore, type CostingStore } from '../ui/stores/costingStore';

export type CostingModule = {
  costingStore: CostingStore;
};

export type CostingModuleDeps = {
  catalog: CatalogRepository;
};

export function createCostingModule(
  container: AppContainer,
  deps: CostingModuleDeps,
): CostingModule {
  const repo = new CostingRepositoryImpl(container.http);

  const costingStore = createCostingStore({
    listCostSheets: new ListCostSheets(repo),
    saveCostSheet: new SaveCostSheet(repo),
    deleteCostSheet: new DeleteCostSheet(repo),
    listPriceSheets: new ListPriceSheets(repo),
    savePriceSheet: new SavePriceSheet(repo),
    deletePriceSheet: new DeletePriceSheet(repo),
    getProducts: new GetProducts(deps.catalog),
    createProduct: new CreateProduct(deps.catalog),
    getMeasureUnits: new GetMeasureUnits(deps.catalog),
  });

  return { costingStore };
}
