export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export type InvoiceLine = {
  description: string;
  qty: number;
  unitPrice: number;
};

export type Invoice = {
  id: string;
  number: string;
  clientName: string;
  clientTax: string;
  lines: InvoiceLine[];
  tax: number;
  subtotal: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
  cid?: string;
};

export type EmitInvoiceInput = {
  clientName: string;
  clientTax?: string;
  lines: InvoiceLine[];
  tax?: number;
  status?: 'issued' | 'paid' | 'draft';
  issuedAt?: string;
};

export type EmitInvoiceResult = {
  invoice: Invoice;
  entryId?: string;
};
