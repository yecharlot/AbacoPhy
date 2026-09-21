import type { AppContainer } from '../../../infrastructure/di';
import { CatalogRepositoryImpl } from '../data/repositories/CatalogRepositoryImpl';
import { GetProducts, CreateProduct, UpdateProduct, GetMeasureUnits, CreateMeasureUnit, DeleteMeasureUnit, GetCurrencies } from '../domain/usecases';
import { createCatalogStore, type CatalogStore } from '../ui/stores/catalogStore';

export type CatalogModule = {
  catalogStore: CatalogStore;
};

export function createCatalogModule(container: AppContainer): CatalogModule {
  const repo = new CatalogRepositoryImpl(container.http);
  const getProducts = new GetProducts(repo);
  const createProduct = new CreateProduct(repo);
  const updateProduct = new UpdateProduct(repo);
  const getMeasureUnits = new GetMeasureUnits(repo);
  const createMeasureUnit = new CreateMeasureUnit(repo);
  const deleteMeasureUnit = new DeleteMeasureUnit(repo);
  const getCurrencies = new GetCurrencies(repo);

  const catalogStore = createCatalogStore({
    getProducts,
    createProduct,
    updateProduct,
    getMeasureUnits,
    createMeasureUnit,
    deleteMeasureUnit,
    getCurrencies,
  });

  return { catalogStore };
}
