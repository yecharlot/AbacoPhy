import type { InvoiceLine } from './InvoiceLine';

export type Invoice = {
  id: string;
  number: string;
  clientName: string;
  clientTax: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  issuedAt: string;
};

export type EmitInvoiceInput = {
  clientName: string;
  clientTax?: string;
  currency?: string;
  tax?: number;
  status?: 'draft' | 'issued' | 'paid';
  lines: Array<{ description: string; qty: number; unitPrice: number }>;
};
