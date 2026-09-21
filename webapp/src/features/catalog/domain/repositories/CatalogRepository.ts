import type { Product, CreateProductInput, UpdateProductInput } from '../entities/Product';
import type { MeasureUnit, CreateMeasureUnitInput } from '../entities/MeasureUnit';
import type { Currency } from '../entities/Currency';

export interface CatalogRepository {
  getProducts(): Promise<Product[]>;
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(input: UpdateProductInput): Promise<Product>;

  getMeasureUnits(): Promise<MeasureUnit[]>;
  createMeasureUnit(input: CreateMeasureUnitInput): Promise<MeasureUnit>;
  deleteMeasureUnit(id: string): Promise<void>;

  getCurrencies(): Promise<Currency[]>;
}
