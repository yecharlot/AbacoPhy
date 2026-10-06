/** Formas de API para /cost-sheets y /price-sheets. */

export type CostComponentDto = {
  product_id?: string;
  product_code?: string;
  product_name?: string;
  qty?: number;
  unit_cost?: number;
  line_cost?: number;
};

export type CostSheetDto = {
  id: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  period?: string;
  components?: CostComponentDto[] | null;
  labor_minutes?: number;
  difficulty_level?: number;
  difficulty_factor?: number;
  labor_base_rate?: number;
  material_cost?: number;
  labor_cost?: number;
  materia_prima?: number;
  materiales_auxiliares?: number;
  energia?: number;
  salario_directo?: number;
  otros_directos?: number;
  gastos_indirectos?: number;
  costo_unitario?: number;
  previous_costo_unitario?: number;
  precio_sugerido?: number;
  updated_at?: string;
  currency?: string;
  notes?: string;
  metadata?: string | null;
};

export type CostSheetsResponseDto = {
  cost_sheets?: CostSheetDto[] | null;
};

export type CostSheetResponseDto = {
  cost_sheet?: CostSheetDto;
  propagated?: number;
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
  metadata?: string | null;
};

export type PriceSheetsResponseDto = {
  sheets?: PriceSheetDto[] | null;
};

export type PriceSheetResponseDto = {
  ok?: boolean;
  sheet?: PriceSheetDto;
};
