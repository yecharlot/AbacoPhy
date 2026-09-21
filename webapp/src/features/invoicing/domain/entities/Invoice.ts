import type { InvoiceLine } from './InvoiceLine';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'emitted' | 'paid' | 'cancelled';
}
