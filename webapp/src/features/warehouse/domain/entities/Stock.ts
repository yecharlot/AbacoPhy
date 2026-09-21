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
};

export type UnitStockRow = {
  unitId: string;
  productId: string;
  qty: number;
  avgCost: number;
  amountBase: number;
};

export type WarehouseSnapshot = {
  rows: WarehouseStockRow[];
  unitStocks: UnitStockRow[];
};
