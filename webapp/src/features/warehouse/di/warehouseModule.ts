import type { AppContainer } from '../../../infrastructure/di';
import type { CatalogRepository } from '../../catalog/domain/repositories/CatalogRepository';
import { GetProducts } from '../../catalog/domain/usecases';
import { WarehouseRepositoryImpl } from '../data/repositories/WarehouseRepositoryImpl';
import type { WarehouseRepository } from '../domain/repositories/WarehouseRepository';
import {
  CreateReception,
  CreateSalesUnit,
  CreateTransfer,
  EnterReception,
  GetSalesUnits,
  GetWarehouseStock,
  ListReceptions,
  ListTransfers,
} from '../domain/usecases';
import { createWarehouseStore, type WarehouseStore } from '../ui/stores/warehouseStore';

export type WarehouseModule = {
  warehouseStore: WarehouseStore;
  /** Contrato de dominio reutilizable por pos (unidades de venta). */
  repository: WarehouseRepository;
};

export type WarehouseModuleDeps = {
  /** Nomenclador de productos, inyectado como contrato de dominio. */
  catalog: CatalogRepository;
};

export function createWarehouseModule(
  container: AppContainer,
  deps: WarehouseModuleDeps,
): WarehouseModule {
  const repo: WarehouseRepository = new WarehouseRepositoryImpl(container.http);

  const warehouseStore = createWarehouseStore({
    appDataBus: container.appDataBus,
    getStock: new GetWarehouseStock(repo),
    getProducts: new GetProducts(deps.catalog),
    getSalesUnits: new GetSalesUnits(repo),
    createSalesUnit: new CreateSalesUnit(repo),
    listReceptions: new ListReceptions(repo),
    createReception: new CreateReception(repo),
    enterReception: new EnterReception(repo),
    listTransfers: new ListTransfers(repo),
    createTransfer: new CreateTransfer(repo),
  });

  return { warehouseStore, repository: repo };
}
