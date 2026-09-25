/** Ecuación ampliada desde saldos del plan de cuentas (backend EquationSnapshot). */
export type Equation = {
  assets: number;
  liabilities: number;
  equity: number;
  income: number;
  expenses: number;
  netProfit: number;
};
