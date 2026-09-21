import type {
  EmitInvoiceInput,
  EmitInvoiceResult,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
} from '../../domain/entities/Invoice';
import type {
  EmitInvoiceRequestDto,
  EmitInvoiceResponseDto,
  InvoiceDto,
  InvoiceLineDto,
} from '../dto/InvoiceDto';

const STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'cancelled'];

function asStatus(v: string | undefined): InvoiceStatus {
  return STATUSES.includes(v as InvoiceStatus) ? (v as InvoiceStatus) : 'issued';
}

function lineDtoToEntity(dto: InvoiceLineDto): InvoiceLine {
  return {
    description: String(dto.description ?? ''),
    qty: Number(dto.qty ?? 0),
    unitPrice: Number(dto.unit_price ?? dto.unitPrice ?? 0),
  };
}

export function invoiceDtoToEntity(dto: InvoiceDto): Invoice {
  const lines = (dto.lines ?? []).map(lineDtoToEntity);
  const subtotal =
    dto.subtotal != null
      ? Number(dto.subtotal)
      : lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = Number(dto.tax ?? 0);
  return {
    id: String(dto.id ?? ''),
    number: String(dto.number ?? dto.num ?? ''),
    clientName: String(dto.client_name ?? dto.clientName ?? ''),
    clientTax: String(dto.client_tax ?? dto.clientTax ?? ''),
    lines,
    tax,
    subtotal,
    total: Number(dto.total ?? subtotal + tax),
    status: asStatus(dto.status),
    issuedAt: String(dto.issued_at ?? dto.issuedAt ?? ''),
    cid: dto.cid ?? dto.root_cid,
  };
}

export function emitInputToDto(input: EmitInvoiceInput): EmitInvoiceRequestDto {
  return {
    client_name: input.clientName,
    client_tax: input.clientTax,
    lines: input.lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unit_price: l.unitPrice,
    })),
    tax: input.tax,
    status: input.status ?? 'issued',
    issued_at: input.issuedAt,
  };
}

export function emitResponseToResult(dto: EmitInvoiceResponseDto): EmitInvoiceResult {
  const raw = dto.factura ?? dto.invoice ?? {};
  return {
    invoice: invoiceDtoToEntity(raw),
    entryId: dto.asiento?.id ?? dto.entry?.id,
  };
}
