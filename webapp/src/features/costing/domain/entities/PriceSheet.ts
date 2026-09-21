/** Ficha de precio: precio de venta y margen sobre un costo de referencia. */
export type PriceSheet = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  costRef: number;
  marginPct: number;
  price: number;
  currency: string;
  notes: string;
};

export type SavePriceSheetInput = {
  productId: string;
  costRef?: number;
  marginPct?: number;
  price?: number;
  currency?: string;
  notes?: string;
};
