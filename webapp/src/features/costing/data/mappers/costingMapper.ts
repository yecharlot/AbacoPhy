import type { CostSheet, SaveCostSheetInput } from '../../domain/entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../../domain/entities/PriceSheet';
import type { CostSheetDto, PriceSheetDto } from '../dto/CostingDto';

export function costSheetDtoToEntity(dto: CostSheetDto): CostSheet {
  return {
    id: dto.id,
    productId: dto.product_id || '',
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    period: dto.period || '',
    materiaPrima: dto.materia_prima || 0,
    materialesAuxiliares: dto.materiales_auxiliares || 0,
    energia: dto.energia || 0,
    salarioDirecto: dto.salario_directo || 0,
    otrosDirectos: dto.otros_directos || 0,
    gastosIndirectos: dto.gastos_indirectos || 0,
    costoUnitario: dto.costo_unitario || 0,
    precioSugerido: dto.precio_sugerido || 0,
    currency: dto.currency || '',
    notes: dto.notes || '',
  };
}

export function saveCostSheetInputToDto(input: SaveCostSheetInput): Record<string, unknown> {
  const body: Record<string, unknown> = { product_id: input.productId };
  if (input.period) body.period = input.period;
  if (input.materiaPrima !== undefined) body.materia_prima = input.materiaPrima;
  if (input.materialesAuxiliares !== undefined) body.materiales_auxiliares = input.materialesAuxiliares;
  if (input.energia !== undefined) body.energia = input.energia;
  if (input.salarioDirecto !== undefined) body.salario_directo = input.salarioDirecto;
  if (input.otrosDirectos !== undefined) body.otros_directos = input.otrosDirectos;
  if (input.gastosIndirectos !== undefined) body.gastos_indirectos = input.gastosIndirectos;
  if (input.precioSugerido !== undefined) body.precio_sugerido = input.precioSugerido;
  if (input.currency) body.currency = input.currency;
  if (input.notes) body.notes = input.notes;
  return body;
}

export function priceSheetDtoToEntity(dto: PriceSheetDto): PriceSheet {
  return {
    id: dto.id,
    productId: dto.product_id || '',
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    costRef: dto.cost_ref || 0,
    marginPct: dto.margin_pct || 0,
    price: dto.price || 0,
    currency: dto.currency || '',
    notes: dto.notes || '',
  };
}

export function savePriceSheetInputToDto(input: SavePriceSheetInput): Record<string, unknown> {
  const body: Record<string, unknown> = { product_id: input.productId };
  if (input.costRef !== undefined) body.cost_ref = input.costRef;
  if (input.marginPct !== undefined) body.margin_pct = input.marginPct;
  if (input.price !== undefined) body.price = input.price;
  if (input.currency) body.currency = input.currency;
  if (input.notes) body.notes = input.notes;
  return body;
}
