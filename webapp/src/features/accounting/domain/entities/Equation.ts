/** Expanded accounting equation from backend (not recalculated on client). */
export type Equation = {
  activo: number;
  pasivo: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
  neto: number;
  pasivoPatrimonioNeto: number;
};

export type Summary = {
  ingresos: number;
  gastos: number;
  neto: number;
  equation: Equation;
  rev?: number;
  rootCid?: string;
};
