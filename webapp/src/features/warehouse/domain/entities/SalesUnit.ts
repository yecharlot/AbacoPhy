/** Unidad de venta (punto de venta del negocio). */
export type SalesUnit = {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateSalesUnitInput = {
  name: string;
  address?: string;
  phone?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type SalesUnitsSnapshot = {
  units: SalesUnit[];
  stocks: UnitStockRowRef[];
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

/** Alias local para evitar dependencia circular de tipos en el snapshot. */
export type UnitStockRowRef = {
  unitId: string;
  productId: string;
  qty: number;
  avgCost: number;
  amountBase: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
