/** Formas de API para /cost-sheets y /price-sheets. */

export type CostSheetDto = {
  id: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  period?: string;
  materia_prima?: number;
  materiales_auxiliares?: number;
  energia?: number;
  salario_directo?: number;
  otros_directos?: number;
  gastos_indirectos?: number;
  costo_unitario?: number;
  precio_sugerido?: number;
  currency?: string;
  notes?: string;
};

export type CostSheetsResponseDto = {
  cost_sheets?: CostSheetDto[] | null;
};

export type CostSheetResponseDto = {
  cost_sheet?: CostSheetDto;
};

export type PriceSheetDto = {
  id: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  cost_ref?: number;
  margin_pct?: number;
  price?: number;
  currency?: string;
  notes?: string;
};

export type PriceSheetsResponseDto = {
  sheets?: PriceSheetDto[] | null;
};

export type PriceSheetResponseDto = {
  ok?: boolean;
  sheet?: PriceSheetDto;
};
