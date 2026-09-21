export type InvoiceLineDto = {
  description?: string;
  qty?: number;
  unit_price?: number;
  unitPrice?: number;
};

export type InvoiceDto = {
  id?: string;
  number?: string;
  num?: string;
  client_name?: string;
  clientName?: string;
  client_tax?: string;
  clientTax?: string;
  lines?: InvoiceLineDto[];
  tax?: number;
  subtotal?: number;
  total?: number;
  status?: string;
  issued_at?: string;
  issuedAt?: string;
  cid?: string;
  root_cid?: string;
};

export type InvoicesResponseDto = {
  invoices?: InvoiceDto[];
  facturas?: InvoiceDto[];
  rev?: number;
};

export type EmitInvoiceRequestDto = {
  client_name: string;
  client_tax?: string;
  lines: { description: string; qty: number; unit_price: number }[];
  tax?: number;
  status?: string;
  issued_at?: string;
};

export type EmitInvoiceResponseDto = {
  factura?: InvoiceDto;
  invoice?: InvoiceDto;
  asiento?: { id?: string };
  entry?: { id?: string };
  ecuacion?: unknown;
  rev?: number;
};
