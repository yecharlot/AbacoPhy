/** Raw summary / equation payload from GET /reports/summary (English or Spanish keys). */
export type SummaryDto = {
  assets?: number;
  liabilities?: number;
  equity?: number;
  income?: number;
  expenses?: number;
  net_profit?: number;
  neto?: number;
  ingresos?: number;
  gastos?: number;
  activo?: number;
  pasivo?: number;
  patrimonio?: number;
  ecuacion?: {
    activo?: number;
    pasivo?: number;
    patrimonio?: number;
    ingresos?: number;
    gastos?: number;
    neto?: number;
    pasivo_patrimonio_neto?: number;
  };
  equation?: {
    assets?: number;
    liabilities?: number;
    equity?: number;
    income?: number;
    expenses?: number;
    net_profit?: number;
  };
};
