import type { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/Product';
import type { MeasureUnit, CreateMeasureUnitInput } from '../../domain/entities/MeasureUnit';
import type { Currency } from '../../domain/entities/Currency';
import type { ProductDto, MeasureUnitDto, CurrencyDto } from '../dto/CatalogDto';

export function productDtoToEntity(dto: ProductDto): Product {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name || '',
    unit: dto.unit || '',
    category: dto.category || '',
    costStd: dto.cost_std || 0,
    priceSale: dto.price_sale || 0,
  };
}

export function createProductInputToDto(input: CreateProductInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name,
  };
  if (input.code) body.code = input.code;
  if (input.unit) body.unit = input.unit;
  if (input.category) body.category = input.category;
  if (input.costStd !== undefined) body.cost_std = input.costStd;
  if (input.priceSale !== undefined) body.price_sale = input.priceSale;
  return body;
}

export function updateProductInputToDto(input: UpdateProductInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id: input.id,
  };
  if (input.code !== undefined) body.code = input.code;
  if (input.name !== undefined) body.name = input.name;
  if (input.unit !== undefined) body.unit = input.unit;
  if (input.category !== undefined) body.category = input.category;
  if (input.costStd !== undefined) body.cost_std = input.costStd;
  if (input.priceSale !== undefined) body.price_sale = input.priceSale;
  return body;
}

export function measureUnitDtoToEntity(dto: MeasureUnitDto): MeasureUnit {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name || '',
    symbol: dto.symbol || '',
    active: dto.active !== false,
  };
}

export function createMeasureUnitInputToDto(input: CreateMeasureUnitInput): Record<string, unknown> {
  return {
    code: input.code,
    name: input.name,
    symbol: input.symbol || '',
  };
}

export function currencyDtoToEntity(dto: CurrencyDto): Currency {
  return {
    code: dto.code || '',
    name: dto.name || '',
    rate: dto.rate || 1,
    active: dto.active !== false,
  };
}
