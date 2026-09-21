/**
 * Ficha de costo según normas cubanas. El costo unitario y el precio sugerido
 * los calcula el backend (margen orientativo 30 %).
 */
export type CostSheet = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  period: string;
  materiaPrima: number;
  materialesAuxiliares: number;
  energia: number;
  salarioDirecto: number;
  otrosDirectos: number;
  gastosIndirectos: number;
  costoUnitario: number;
  precioSugerido: number;
  currency: string;
  notes: string;
};

export type SaveCostSheetInput = {
  productId: string;
  period?: string;
  materiaPrima?: number;
  materialesAuxiliares?: number;
  energia?: number;
  salarioDirecto?: number;
  otrosDirectos?: number;
  gastosIndirectos?: number;
  precioSugerido?: number;
  currency?: string;
  notes?: string;
};
