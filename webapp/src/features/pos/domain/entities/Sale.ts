/** Venta de mostrador. Precios, descuento de stock y asientos los aplica el backend. */
export type SaleLine = {
  productId: string;
  productCode: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountAmt: number;
  lineTotal: number;
  unitCost: number;
  costAmount: number;
};

export type Sale = {
  id: string;
  number: string;
  date: string;
  unitId: string;
  unitName: string;
  seller: string;
  lines: SaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  currency: string;
  status: string;
  note: string;
};

export type CreateSaleLineInput = {
  productId: string;
  qty: number;
  unitPrice?: number;
  discountPct?: number;
};

export type CreateSaleInput = {
  unitId?: string;
  seller?: string;
  date?: string;
  note?: string;
  lines: CreateSaleLineInput[];
};
