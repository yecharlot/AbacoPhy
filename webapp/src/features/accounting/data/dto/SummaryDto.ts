/** Raw summary from GET /reports/summary (English, Spanish and legacy keys). */
export type SummaryDto = {
  assets?: number;
  liabilities?: number;
  equity?: number;
  income?: number;
  expenses?: number;
  net_profit?: number;
  neto?: number;
  net?: number;
  ingresos?: number;
  gastos?: number;
  activo?: number;
  pasivo?: number;
  patrimonio?: number;
  income_total?: number;
  expense_total?: number;
  currency?: string;
  inventory_items?: number;
  inventory_cost_value?: number;
  invoices_count?: number;
  invoices_issued_total?: number;
  invoices_paid_total?: number;
  employees?: number;
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
