/**
 * Ficha de precio — capa comercial sobre el costo vigente.
 * Política: margin_pct del API = MARKUP sobre costo (price = cost_ref × (1 + margin_pct/100)).
 * Al guardar, el backend publica Price → Product.PriceSale (canal POS).
 */

export type PriceSheet = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  /** Costo de referencia usado al guardar la ficha */
  costRef: number;
  /** Markup % sobre costo (nombre histórico margin_pct en API) */
  marginPct: number;
  /** Precio de la ficha (al guardar = precio publicado) */
  price: number;
  currency: string;
  notes: string;
  updatedAt: string;
  metadata?: string | null;
};

export type SavePriceSheetInput = {
  productId: string;
  costRef?: number;
  marginPct?: number;
  price?: number;
  currency?: string;
  notes?: string;
  metadata?: string | null;
};
