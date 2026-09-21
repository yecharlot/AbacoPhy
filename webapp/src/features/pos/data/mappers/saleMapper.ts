import type { CreateSaleInput, Sale, SaleLine } from '../../domain/entities/Sale';
import type { SaleDto, SaleLineDto } from '../dto/SaleDto';

function saleLineDtoToEntity(dto: SaleLineDto): SaleLine {
  return {
    productId: dto.product_id,
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    qty: dto.qty || 0,
    unitPrice: dto.unit_price || 0,
    discountPct: dto.discount_pct || 0,
    discountAmt: dto.discount_amt || 0,
    lineTotal: dto.line_total || 0,
    unitCost: dto.unit_cost || 0,
    costAmount: dto.cost_amount || 0,
  };
}

export function saleDtoToEntity(dto: SaleDto): Sale {
  return {
    id: dto.id,
    number: dto.number || '',
    date: dto.date || '',
    unitId: dto.unit_id || '',
    unitName: dto.unit_name || '',
    seller: dto.seller || '',
    lines: (dto.lines || []).map(saleLineDtoToEntity),
    subtotal: dto.subtotal || 0,
    discount: dto.discount || 0,
    total: dto.total || 0,
    costTotal: dto.cost_total || 0,
    currency: dto.currency || '',
    status: dto.status || '',
    note: dto.note || '',
  };
}

export function createSaleInputToDto(input: CreateSaleInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    lines: input.lines.map((line) => {
      const dto: Record<string, unknown> = { product_id: line.productId, qty: line.qty };
      if (line.unitPrice !== undefined) dto.unit_price = line.unitPrice;
      if (line.discountPct !== undefined) dto.discount_pct = line.discountPct;
      return dto;
    }),
  };
  if (input.unitId) body.unit_id = input.unitId;
  if (input.seller) body.seller = input.seller;
  if (input.date) body.date = input.date;
  if (input.note) body.note = input.note;
  return body;
}
