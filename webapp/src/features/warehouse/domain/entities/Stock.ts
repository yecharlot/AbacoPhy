/** Existencias del almacén central. El costo promedio ponderado lo calcula el backend. */
export type WarehouseStockRow = {
  productId: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  avgCost: number;
  amountBase: number;
  currency: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type UnitStockRow = {
  unitId: string;
  productId: string;
  qty: number;
  avgCost: number;
  amountBase: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type WarehouseSnapshot = {
  rows: WarehouseStockRow[];
  unitStocks: UnitStockRow[];
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
