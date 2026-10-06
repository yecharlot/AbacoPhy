/**
 * Ficha de costo — receta de elaboración (productos compuestos).
 * Política: webapp/.policies/costing/fichas-costo-composicion.md
 */

export type CostComponent = {
  productId: string;
  productCode: string;
  productName: string;
  /** Cantidad o fracción por 1 unidad del producto elaborado */
  qty: number;
  unitCost: number;
  lineCost: number;
};

export type CostSheet = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  period: string;
  components: CostComponent[];
  laborMinutes: number;
  difficultyLevel: number;
  difficultyFactor: number;
  laborBaseRate: number;
  materialCost: number;
  laborCost: number;
  /** Legacy (compatibilidad API; no UI nueva) */
  materiaPrima: number;
  materialesAuxiliares: number;
  energia: number;
  salarioDirecto: number;
  otrosDirectos: number;
  gastosIndirectos: number;
  costoUnitario: number;
  previousCostoUnitario: number;
  precioSugerido: number;
  updatedAt: string;
  currency: string;
  notes: string;
  metadata?: string | null;
};

export type SaveCostComponentInput = {
  productId: string;
  qty: number;
};

export type SaveCostSheetInput = {
  productId: string;
  period?: string;
  components?: SaveCostComponentInput[];
  laborMinutes?: number;
  difficultyLevel?: number;
  difficultyFactor?: number;
  laborBaseRate?: number;
  materiaPrima?: number;
  materialesAuxiliares?: number;
  energia?: number;
  salarioDirecto?: number;
  otrosDirectos?: number;
  gastosIndirectos?: number;
  precioSugerido?: number;
  currency?: string;
  notes?: string;
  metadata?: string | null;
};
