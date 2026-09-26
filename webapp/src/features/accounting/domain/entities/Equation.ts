/** Ecuación ampliada desde saldos del plan de cuentas (backend EquationSnapshot). */
export type Equation = {
  assets: number;
  liabilities: number;
  equity: number;
  income: number;
  expenses: number;
  netProfit: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;
};

export type Summary = Equation;
