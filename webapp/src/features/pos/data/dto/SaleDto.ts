/** Formas de API para /pos/sales. */

export type SaleLineDto = {
  product_id: string;
  product_code?: string;
  product_name?: string;
  qty?: number;
  unit_price?: number;
  discount_pct?: number;
  discount_amt?: number;
  line_total?: number;
  unit_cost?: number;
  cost_amount?: number;
  metadata?: unknown;
};

export type SaleDto = {
  id: string;
  number?: string;
  date?: string;
  unit_id?: string;
  unit_name?: string;
  seller?: string;
  lines?: SaleLineDto[] | null;
  subtotal?: number;
  discount?: number;
  total?: number;
  cost_total?: number;
  currency?: string;
  status?: string;
  note?: string;
  /**
   * Flexible: string JSON u objeto.
   * El mapper lo normaliza a string canónico (nunca rompe el listado).
   */
  metadata?: unknown;
};

export type SalesResponseDto = {
  sales?: SaleDto[] | null;
};

export type SaleResponseDto = {
  sale?: SaleDto;
};
