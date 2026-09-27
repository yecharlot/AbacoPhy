export type InvoiceLineDto = {
  description?: string;
  qty?: number;
  unit_price?: number;
  unitPrice?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type InvoicesResponseDto = {
  invoices?: InvoiceDto[];
  facturas?: InvoiceDto[];
  rev?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type EmitInvoiceRequestDto = {
  client_name: string;
  client_tax?: string;
  lines: { description: string; qty: number; unit_price: number }[];
  tax?: number;
  status?: string;
  issued_at?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type EmitInvoiceResponseDto = {
  factura?: InvoiceDto;
  invoice?: InvoiceDto;
  asiento?: { id?: string };
  entry?: { id?: string };
  ecuacion?: unknown;
  rev?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
