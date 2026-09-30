import type { UnitStockRow, WarehouseStockRow } from '../../domain/entities/Stock';
import type { SalesUnit, CreateSalesUnitInput } from '../../domain/entities/SalesUnit';
import type { Reception, ReceptionLine, CreateReceptionInput } from '../../domain/entities/Reception';
import { RECEPTION_ABANDON_MARKER } from '../../domain/entities/Reception';
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
import { normalizeMetadataField, metadataToDto } from '../../../../infrastructure/domain/metadata';

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
      metadata: normalizeMetadataField(dto),

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
      metadata: normalizeMetadataField(dto),

  };
}

export function createSalesUnitInputToDto(input: CreateSalesUnitInput): Record<string, unknown> {
  const body: Record<string, unknown> = { name: input.name };
  if (input.address) body.address = input.address;
  if (input.phone) body.phone = input.phone;
  return body;
}

function readReceptionMetadata(value: unknown): Reception['metadataState'] {
  let metadata: Record<string, unknown> | null = null;
  if (typeof value === 'string') {
    try { metadata = JSON.parse(value) as Record<string, unknown>; } catch { return undefined; }
  } else if (value && typeof value === 'object') {
    metadata = value as Record<string, unknown>;
  }
  const state = metadata?.['int.reception_status'];
  if (state !== 'pending_entry' && state !== 'entry_confirmed' && state !== 'entry_problem') return undefined;
  return {
    receptionStatus: state,
    problemReason: typeof metadata?.['int.reception_problem_reason'] === 'string' ? metadata['int.reception_problem_reason'] as string : undefined,
    entryActor: typeof metadata?.['int.reception_entry_actor'] === 'string' ? metadata['int.reception_entry_actor'] as string : undefined,
    entryAt: typeof metadata?.['int.reception_entry_at'] === 'string' ? metadata['int.reception_entry_at'] as string : undefined,
    abandonReason: typeof metadata?.['int.reception_abandon_reason'] === 'string' ? metadata['int.reception_abandon_reason'] as string : undefined,
  };
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



/** Si el backend solo guardó incidencia, el marcador FE eleva a abandoned en UI. */
function normalizeReceptionMetadataState(
  state: Reception['metadataState'],
  note?: string,
): Reception['metadataState'] {
  if (!state) {
    if (note && note.includes(RECEPTION_ABANDON_MARKER)) {
      return {
        receptionStatus: 'abandoned',
        abandonReason: note.replace(RECEPTION_ABANDON_MARKER, '').trim(),
        problemReason: note,
      };
    }
    return state;
  }
  const reason = state.problemReason || state.abandonReason || note || '';
  if (
    state.receptionStatus === 'abandoned' ||
    state.receptionStatus === 'cancelled' ||
    (reason && reason.includes(RECEPTION_ABANDON_MARKER))
  ) {
    const clean = reason
      .replace(RECEPTION_ABANDON_MARKER, '')
      .replace(/^\s*ABANDONO\s*:\s*/i, '')
      .trim();
    return {
      ...state,
      receptionStatus: 'abandoned',
      abandonReason: state.abandonReason || clean || reason,
      problemReason: state.problemReason,
    };
  }
  return state;
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
    metadataState: normalizeReceptionMetadataState(readReceptionMetadata(d.metadata), d.note || ''),
    enteredBy: d.entered_by,
    enteredAt: d.entered_at,
      metadata: normalizeMetadataField(dto),

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

export function enterReceptionInputToDto(input: {
  id: string;
  accept: boolean;
  note?: string;
  reason?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = { id: input.id, accept: input.accept };
  if (input.note) body.note = input.note;
  if (input.reason) body.reason = input.reason;
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
      metadata: normalizeMetadataField(dto),

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
