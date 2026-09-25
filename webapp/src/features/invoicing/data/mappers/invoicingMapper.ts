import type { EmitInvoiceInput, Invoice } from '../../domain/entities/Invoice';
import type { InvoiceLine } from '../../domain/entities/InvoiceLine';

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type LineDto = {
  description?: string;
  qty?: number;
  unit_price?: number;
  amount?: number;
  product_name?: string;
  quantity?: number;
  price?: number;
  total?: number;
};

type InvoiceDto = {
  id?: string;
  number?: string;
  client_name?: string;
  client_tax?: string;
  customer_name?: string;
  customer_id?: string;
  lines?: LineDto[];
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  status?: string;
  issued_at?: string;
  created_by?: string;
  operator_id?: string;
  operator_name?: string;
  unit_id?: string;
  unit_name?: string;
  issuer_name?: string;
  issuer_tax_id?: string;
  issuer_address?: string;
  issuer_phone?: string;
  cid?: string;
};

export const invoicingMapper = {
  toEntity(dto: InvoiceDto): Invoice {
    const lines: InvoiceLine[] = (dto.lines || []).map((l) => {
      const qty = n(l.qty ?? l.quantity);
      const unitPrice = n(l.unit_price ?? l.price);
      const amount = n(l.amount ?? l.total) || qty * unitPrice;
      return {
        description: l.description || l.product_name || '—',
        qty,
        unitPrice,
        amount,
      };
    });
    return {
      id: dto.id || '',
      number: dto.number || '',
      clientName: dto.client_name || dto.customer_name || '',
      clientTax: dto.client_tax || dto.customer_id || '',
      lines,
      subtotal: n(dto.subtotal),
      tax: n(dto.tax),
      total: n(dto.total),
      currency: dto.currency || 'CUP',
      status: dto.status || 'draft',
      issuedAt: dto.issued_at || '',
      createdBy: dto.created_by,
      operatorId: dto.operator_id,
      operatorName: dto.operator_name,
      unitId: dto.unit_id,
      unitName: dto.unit_name,
      issuerName: dto.issuer_name,
      issuerTaxId: dto.issuer_tax_id,
      issuerAddress: dto.issuer_address,
      issuerPhone: dto.issuer_phone,
      cid: dto.cid,
    };
  },

  toEmitDto(input: EmitInvoiceInput): Record<string, unknown> {
    const lines = input.lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unit_price: l.unitPrice,
      amount: l.qty * l.unitPrice,
    }));
    const body: Record<string, unknown> = {
      client_name: input.clientName,
      client_tax: input.clientTax || undefined,
      currency: input.currency || 'CUP',
      tax: input.tax ?? 0,
      status: input.status || 'issued',
      lines,
    };
    if (input.operatorId) body.operator_id = input.operatorId;
    if (input.operatorName) body.operator_name = input.operatorName;
    if (input.unitId) body.unit_id = input.unitId;
    if (input.unitName) body.unit_name = input.unitName;
    if (input.issuerName) body.issuer_name = input.issuerName;
    if (input.issuerTaxId) body.issuer_tax_id = input.issuerTaxId;
    if (input.issuerAddress) body.issuer_address = input.issuerAddress;
    if (input.issuerPhone) body.issuer_phone = input.issuerPhone;
    return body;
  },
};
