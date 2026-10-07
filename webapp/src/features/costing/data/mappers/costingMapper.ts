import type { CostSheet, SaveCostSheetInput } from '../../domain/entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../../domain/entities/PriceSheet';
import type { CostSheetDto, PriceSheetDto } from '../dto/CostingDto';
import { normalizeMetadataField, metadataToDto } from '../../../../infrastructure/domain/metadata';

export function costSheetDtoToEntity(dto: CostSheetDto): CostSheet {
  const components = (dto.components ?? []).map((c) => ({
    productId: c.product_id || '',
    productCode: c.product_code || '',
    productName: c.product_name || '',
    qty: c.qty || 0,
    unitCost: c.unit_cost || 0,
    lineCost: c.line_cost || 0,
  }));
  return {
    id: dto.id,
    productId: dto.product_id || '',
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    period: dto.period || '',
    components,
    laborMinutes: dto.labor_minutes || 0,
    difficultyLevel: dto.difficulty_level || 0,
    difficultyFactor: dto.difficulty_factor || 0,
    laborBaseRate: dto.labor_base_rate || 0,
    materialCost: dto.material_cost || 0,
    laborCost: dto.labor_cost || 0,
    materiaPrima: dto.materia_prima || 0,
    materialesAuxiliares: dto.materiales_auxiliares || 0,
    energia: dto.energia || 0,
    salarioDirecto: dto.salario_directo || 0,
    otrosDirectos: dto.otros_directos || 0,
    gastosIndirectos: dto.gastos_indirectos || 0,
    costoUnitario: dto.costo_unitario || 0,
    previousCostoUnitario: dto.previous_costo_unitario || 0,
    precioSugerido: dto.precio_sugerido || 0,
    updatedAt: dto.updated_at || '',
    currency: dto.currency || '',
    notes: dto.notes || '',
    metadata: normalizeMetadataField(dto),
  };
}

export function saveCostSheetInputToDto(input: SaveCostSheetInput): Record<string, unknown> {
  const body: Record<string, unknown> = { product_id: String(input.productId || '') };
  if (input.period) body.period = input.period;
  if (input.components?.length) {
    body.components = input.components.map((c) => ({
      product_id: c.productId,
      qty: c.qty,
    }));
  }
  if (input.laborMinutes !== undefined) body.labor_minutes = input.laborMinutes;
  if (input.difficultyLevel !== undefined) body.difficulty_level = input.difficultyLevel;
  if (input.difficultyFactor !== undefined) body.difficulty_factor = input.difficultyFactor;
  if (input.laborBaseRate !== undefined) body.labor_base_rate = input.laborBaseRate;
  if (input.materiaPrima !== undefined) body.materia_prima = input.materiaPrima;
  if (input.materialesAuxiliares !== undefined) body.materiales_auxiliares = input.materialesAuxiliares;
  if (input.energia !== undefined) body.energia = input.energia;
  if (input.salarioDirecto !== undefined) body.salario_directo = input.salarioDirecto;
  if (input.otrosDirectos !== undefined) body.otros_directos = input.otrosDirectos;
  if (input.gastosIndirectos !== undefined) body.gastos_indirectos = input.gastosIndirectos;
  if (input.precioSugerido !== undefined) body.precio_sugerido = input.precioSugerido;
  if (input.currency) body.currency = input.currency;
  if (input.notes) body.notes = input.notes;
  const meta = metadataToDto(input.metadata);
  if (meta !== undefined) body.metadata = meta;
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
    updatedAt: dto.updated_at || '',
    metadata: normalizeMetadataField(dto),
  };
}

export function savePriceSheetInputToDto(input: SavePriceSheetInput): Record<string, unknown> {
  const body: Record<string, unknown> = { product_id: input.productId };
  if (input.costRef !== undefined) body.cost_ref = input.costRef;
  if (input.marginPct !== undefined) body.margin_pct = input.marginPct;
  if (input.price !== undefined) body.price = input.price;
  if (input.currency) body.currency = input.currency;
  if (input.notes) body.notes = input.notes;
  const meta = metadataToDto(input.metadata);
  if (meta !== undefined) body.metadata = meta;
  return body;
}
