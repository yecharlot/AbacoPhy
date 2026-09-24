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
    unit: (dto as { unit?: string }).unit || '',
    qty: dto.qty || 0,
    unitCost: dto.unit_cost || 0,
    amount: dto.amount || 0,
  };
}

export function receptionDtoToEntity(dto: ReceptionDto): Reception {
  const d = dto as ReceptionDto & {
    has_invoice?: boolean;
    invoice_ref?: string;
    receiver?: string;
    entered_by?: string;
    entered_at?: string;
  };
  return {
    id: d.id,
    number: d.number || '',
    date: d.date || '',
    hasInvoice: !!d.has_invoice,
    invoiceRef: d.invoice_ref || d.doc_ref || '',
    supplier: d.supplier || '',
    receiver: d.receiver || '',
    docRef: d.doc_ref || '',
    lines: (d.lines || []).map(receptionLineDtoToEntity),
    totalCost: d.total_cost || 0,
    currency: d.currency || '',
    status: d.status || '',
    note: d.note || '',
    enteredBy: d.entered_by,
    enteredAt: d.entered_at,
  };
}

export function createReceptionInputToDto(input: CreateReceptionInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    has_invoice: !!input.hasInvoice,
    receiver: input.receiver,
    lines: input.lines.map((l) => ({
      product_id: l.productId,
      qty: l.qty,
      unit_cost: l.unitCost,
      unit: l.unit || undefined,
    })),
  };
  if (input.supplier) body.supplier = input.supplier;
  if (input.invoiceRef) body.invoice_ref = input.invoiceRef;
  if (input.docRef) body.doc_ref = input.docRef;
  if (input.date) body.date = input.date;
  if (input.note) body.note = input.note;
  return body;
}

export function enterReceptionInputToDto(input: { id: string; accept: boolean; note?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = { id: input.id, accept: input.accept };
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
