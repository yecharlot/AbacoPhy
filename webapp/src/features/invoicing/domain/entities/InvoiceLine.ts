export type InvoiceLine = {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
