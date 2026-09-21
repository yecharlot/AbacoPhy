/** Unidad de venta (punto de venta del negocio). */
export type SalesUnit = {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
};

export type CreateSalesUnitInput = {
  name: string;
  address?: string;
  phone?: string;
};

export type SalesUnitsSnapshot = {
  units: SalesUnit[];
  stocks: UnitStockRowRef[];
};

/** Alias local para evitar dependencia circular de tipos en el snapshot. */
export type UnitStockRowRef = {
  unitId: string;
  productId: string;
  qty: number;
  avgCost: number;
  amountBase: number;
};
