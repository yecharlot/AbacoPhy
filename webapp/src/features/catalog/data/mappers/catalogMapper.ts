import type { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/Product';
import type { MeasureUnit, CreateMeasureUnitInput } from '../../domain/entities/MeasureUnit';
import type { Currency } from '../../domain/entities/Currency';
import type { ProductDto, MeasureUnitDto, CurrencyDto } from '../dto/CatalogDto';
import {
  normalizeMetadataField,
  metadataToApiObject,
} from '../../../../infrastructure/domain/metadata';

export function productDtoToEntity(dto: ProductDto): Product {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name || '',
    unit: dto.unit || '',
    category: dto.category || '',
    costStd: dto.cost_std,
    priceSale: dto.price_sale,
    metadata: normalizeMetadataField(dto),
  };
}

/**
 * Body POST /products.
 * name obligatorio (trim). metadata solo si existe, como **objeto** (Go map).
 */
export function createProductInputToDto(input: CreateProductInput): Record<string, unknown> {
  const name = String(input.name ?? '').trim();
  const body: Record<string, unknown> = { name };
  if (input.code?.trim()) body.code = input.code.trim();
  if (input.unit?.trim()) body.unit = input.unit.trim();
  else body.unit = 'ud';
  if (input.category?.trim()) body.category = input.category.trim();
  // Nunca metadataToDto(input) — serializaba todo el input y rompía el decode Go
  const meta = metadataToApiObject(input.metadata);
  if (meta) body.metadata = meta;
  return body;
}

export function updateProductInputToDto(input: UpdateProductInput): Record<string, unknown> {
  const body: Record<string, unknown> = { id: input.id };
  if (input.code !== undefined) body.code = input.code;
  if (input.name !== undefined) body.name = String(input.name).trim();
  if (input.unit !== undefined) body.unit = input.unit;
  if (input.category !== undefined) body.category = input.category;
  const meta = metadataToApiObject(input.metadata);
  if (meta) body.metadata = meta;
  return body;
}

export function measureUnitDtoToEntity(dto: MeasureUnitDto): MeasureUnit {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name || '',
    symbol: dto.symbol || '',
    active: dto.active !== false,
    metadata: normalizeMetadataField(dto),
  };
}

export function createMeasureUnitInputToDto(input: CreateMeasureUnitInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: input.code,
    name: input.name,
    symbol: input.symbol || '',
  };
  const meta = metadataToApiObject(input.metadata);
  if (meta) body.metadata = meta;
  return body;
}

export function currencyDtoToEntity(dto: CurrencyDto): Currency {
  return {
    code: dto.code || '',
    name: dto.name || '',
    rate: dto.rate || 1,
    active: dto.active !== false,
    metadata: normalizeMetadataField(dto),
  };
}
