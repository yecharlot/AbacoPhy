/** Formas de API para /warehouse, /units, /receptions y /transfers. */

export type WarehouseRowDto = {
  product_id: string;
  code?: string;
  name?: string;
  unit?: string;
  qty?: number;
  avg_cost?: number;
  amount_base?: number;
  currency?: string;
};

export type UnitStockDto = {
  unit_id: string;
  product_id: string;
  qty?: number;
  avg_cost?: number;
  amount_base?: number;
};

export type WarehouseResponseDto = {
  warehouse?: WarehouseRowDto[] | null;
  unit_stocks?: UnitStockDto[] | null;
};

export type SalesUnitDto = {
  id: string;
  code?: string;
  name?: string;
  address?: string;
  phone?: string;
  active?: boolean;
};

export type SalesUnitsResponseDto = {
  units?: SalesUnitDto[] | null;
  stocks?: UnitStockDto[] | null;
};

export type SalesUnitResponseDto = {
  unit?: SalesUnitDto;
};

export type ReceptionLineDto = {
  product_id: string;
  product_code?: string;
  product_name?: string;
  qty?: number;
  unit_cost?: number;
  amount?: number;
};

export type ReceptionDto = {
  id: string;
  number?: string;
  date?: string;
  supplier?: string;
  doc_ref?: string;
  lines?: ReceptionLineDto[] | null;
  total_cost?: number;
  currency?: string;
  status?: string;
  note?: string;
};

export type ReceptionsResponseDto = {
  receptions?: ReceptionDto[] | null;
};

export type ReceptionResponseDto = {
  reception?: ReceptionDto;
};

export type TransferLineDto = {
  product_id: string;
  product_code?: string;
  product_name?: string;
  qty?: number;
  unit_cost?: number;
  amount?: number;
};

export type TransferDto = {
  id: string;
  number?: string;
  date?: string;
  unit_id?: string;
  unit_name?: string;
  lines?: TransferLineDto[] | null;
  status?: string;
  note?: string;
};

export type TransfersResponseDto = {
  transfers?: TransferDto[] | null;
};

export type TransferResponseDto = {
  transfer?: TransferDto;
};
