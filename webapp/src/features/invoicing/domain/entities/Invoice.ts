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
  /** Usuario de sesión que registró (backend CreatedBy) */
  createdBy?: string;
  /** Trabajador seleccionado como emisor operativo */
  operatorId?: string;
  operatorName?: string;
  /** Unidad de venta / punto del negocio */
  unitId?: string;
  unitName?: string;
  /** Datos del negocio emisor (tenant) */
  issuerName?: string;
  issuerTaxId?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  cid?: string;
};

export type EmitInvoiceInput = {
  clientName: string;
  clientTax?: string;
  currency?: string;
  tax?: number;
  status?: 'draft' | 'issued' | 'paid';
  lines: Array<{ description: string; qty: number; unitPrice: number }>;
  operatorId?: string;
  operatorName?: string;
  unitId?: string;
  unitName?: string;
  issuerName?: string;
  issuerTaxId?: string;
  issuerAddress?: string;
  issuerPhone?: string;
};
