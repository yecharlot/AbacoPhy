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
  product_id?: string;
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
  customer_id?: string;
  customer_name?: string;
  lines?: LineDto[];
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  status?: string;
  issued_at?: string;
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
    };
  },

  /** Body que espera Go domain.Invoice */
  toEmitDto(input: EmitInvoiceInput): Record<string, unknown> {
    const lines = input.lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unit_price: l.unitPrice,
      amount: l.qty * l.unitPrice,
    }));
    return {
      client_name: input.clientName,
      client_tax: input.clientTax || undefined,
      currency: input.currency || 'CUP',
      tax: input.tax ?? 0,
      status: input.status || 'issued',
      lines,
    };
  },
};
