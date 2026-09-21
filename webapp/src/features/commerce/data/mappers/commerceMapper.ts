import type {
  CreateOnlineOrderInput,
  OnlineOrder,
  OnlineOrderLine,
} from '../../domain/entities/OnlineOrder';
import type { OnlineOrderDto, OnlineOrderLineDto } from '../dto/OnlineOrderDto';

function orderLineDtoToEntity(dto: OnlineOrderLineDto): OnlineOrderLine {
  return {
    productId: dto.product_id,
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    qty: dto.qty || 0,
    unitPrice: dto.unit_price || 0,
    lineTotal: dto.line_total || 0,
  };
}

export function onlineOrderDtoToEntity(dto: OnlineOrderDto): OnlineOrder {
  return {
    id: dto.id,
    number: dto.number || '',
    customer: dto.customer || '',
    phone: dto.phone || '',
    address: dto.address || '',
    status: dto.status || 'pending',
    lines: (dto.lines || []).map(orderLineDtoToEntity),
    total: dto.total || 0,
    currency: dto.currency || '',
    notes: dto.notes || '',
  };
}

export function createOnlineOrderInputToDto(input: CreateOnlineOrderInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    customer: input.customer,
    lines: input.lines.map((line) => {
      const dto: Record<string, unknown> = { product_id: line.productId, qty: line.qty };
      if (line.unitPrice !== undefined) dto.unit_price = line.unitPrice;
      return dto;
    }),
  };
  if (input.phone) body.phone = input.phone;
  if (input.address) body.address = input.address;
  if (input.notes) body.notes = input.notes;
  return body;
}
