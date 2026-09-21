import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/Product';
import type { MeasureUnit, CreateMeasureUnitInput } from '../../domain/entities/MeasureUnit';
import type { Currency } from '../../domain/entities/Currency';
import type { CatalogRepository } from '../../domain/repositories/CatalogRepository';
import { CatalogRemoteSource } from '../sources/CatalogRemoteSource';
import {
  productDtoToEntity,
  createProductInputToDto,
  updateProductInputToDto,
  measureUnitDtoToEntity,
  createMeasureUnitInputToDto,
  currencyDtoToEntity,
} from '../mappers/catalogMapper';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class CatalogRepositoryImpl implements CatalogRepository {
  private readonly remote: CatalogRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new CatalogRemoteSource(http);
  }

  async getProducts(): Promise<Product[]> {
    try {
      const dto = await this.remote.getProducts();
      return (dto.products || []).map(productDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    try {
      const dto = await this.remote.createProduct(createProductInputToDto(input));
      return productDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async updateProduct(input: UpdateProductInput): Promise<Product> {
    try {
      const dto = await this.remote.updateProduct(updateProductInputToDto(input));
      return productDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getMeasureUnits(): Promise<MeasureUnit[]> {
    try {
      const dto = await this.remote.getMeasureUnits();
      return (dto.units || []).map(measureUnitDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createMeasureUnit(input: CreateMeasureUnitInput): Promise<MeasureUnit> {
    try {
      const dto = await this.remote.createMeasureUnit(createMeasureUnitInputToDto(input));
      return measureUnitDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async deleteMeasureUnit(id: string): Promise<void> {
    try {
      await this.remote.deleteMeasureUnit(id);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getCurrencies(): Promise<Currency[]> {
    try {
      const dto = await this.remote.getCurrencies();
      return (dto.currencies || []).map(currencyDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
