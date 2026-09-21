import type { UnitStockRow, WarehouseStockRow } from '../../domain/entities/Stock';
import type { SalesUnit, CreateSalesUnitInput } from '../../domain/entities/SalesUnit';
import type { Reception, ReceptionLine, CreateReceptionInput } from '../../domain/entities/Reception';
import type { Transfer, TransferLine, CreateTransferInput } from '../../domain/entities/Transfer';
import type {
  ReceptionDto,
  ReceptionLineDto,
  SalesUnitDto,
  TransferDto,
  TransferLineDto,
  UnitStockDto,
  WarehouseRowDto,
} from '../dto/WarehouseDto';

export function warehouseRowDtoToEntity(dto: WarehouseRowDto): WarehouseStockRow {
  return {
    productId: dto.product_id,
    code: dto.code || '',
    name: dto.name || dto.product_id,
    unit: dto.unit || 'u',
    qty: dto.qty || 0,
    avgCost: dto.avg_cost || 0,
    amountBase: dto.amount_base || 0,
    currency: dto.currency || '',
  };
}

export function unitStockDtoToEntity(dto: UnitStockDto): UnitStockRow {
  return {
    unitId: dto.unit_id,
    productId: dto.product_id,
    qty: dto.qty || 0,
    avgCost: dto.avg_cost || 0,
    amountBase: dto.amount_base || 0,
  };
}

export function salesUnitDtoToEntity(dto: SalesUnitDto): SalesUnit {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name || '',
    address: dto.address || '',
    phone: dto.phone || '',
    active: dto.active !== false,
  };
}

export function createSalesUnitInputToDto(input: CreateSalesUnitInput): Record<string, unknown> {
  const body: Record<string, unknown> = { name: input.name };
  if (input.address) body.address = input.address;
  if (input.phone) body.phone = input.phone;
  return body;
}

function receptionLineDtoToEntity(dto: ReceptionLineDto): ReceptionLine {
  return {
    productId: dto.product_id,
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    qty: dto.qty || 0,
    unitCost: dto.unit_cost || 0,
    amount: dto.amount || 0,
  };
}

export function receptionDtoToEntity(dto: ReceptionDto): Reception {
  return {
    id: dto.id,
    number: dto.number || '',
    date: dto.date || '',
    supplier: dto.supplier || '',
    docRef: dto.doc_ref || '',
    lines: (dto.lines || []).map(receptionLineDtoToEntity),
    totalCost: dto.total_cost || 0,
    currency: dto.currency || '',
    status: dto.status || '',
    note: dto.note || '',
  };
}

export function createReceptionInputToDto(input: CreateReceptionInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    lines: input.lines.map((l) => ({
      product_id: l.productId,
      qty: l.qty,
      unit_cost: l.unitCost,
    })),
  };
  if (input.supplier) body.supplier = input.supplier;
  if (input.docRef) body.doc_ref = input.docRef;
  if (input.date) body.date = input.date;
  if (input.note) body.note = input.note;
  return body;
}

function transferLineDtoToEntity(dto: TransferLineDto): TransferLine {
  return {
    productId: dto.product_id,
    productCode: dto.product_code || '',
    productName: dto.product_name || '',
    qty: dto.qty || 0,
    unitCost: dto.unit_cost || 0,
    amount: dto.amount || 0,
  };
}

export function transferDtoToEntity(dto: TransferDto): Transfer {
  return {
    id: dto.id,
    number: dto.number || '',
    date: dto.date || '',
    unitId: dto.unit_id || '',
    unitName: dto.unit_name || '',
    lines: (dto.lines || []).map(transferLineDtoToEntity),
    status: dto.status || '',
    note: dto.note || '',
  };
}

export function createTransferInputToDto(input: CreateTransferInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    unit_id: input.unitId,
    lines: input.lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
  };
  if (input.date) body.date = input.date;
  if (input.note) body.note = input.note;
  return body;
}
