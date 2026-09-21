import type { AppContainer } from '../../../infrastructure/di';
import { CatalogRepositoryImpl } from '../data/repositories/CatalogRepositoryImpl';
import type { CatalogRepository } from '../domain/repositories/CatalogRepository';
import { GetProducts, CreateProduct, UpdateProduct, GetMeasureUnits, CreateMeasureUnit, DeleteMeasureUnit, GetCurrencies } from '../domain/usecases';
import { createCatalogStore, type CatalogStore } from '../ui/stores/catalogStore';

export type CatalogModule = {
  catalogStore: CatalogStore;
  /** Contrato de dominio reutilizable por features de fase 8 (warehouse, pos, costing, commerce). */
  repository: CatalogRepository;
};

export function createCatalogModule(container: AppContainer): CatalogModule {
  const repo: CatalogRepository = new CatalogRepositoryImpl(container.http);
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

  return { catalogStore, repository: repo };
}
