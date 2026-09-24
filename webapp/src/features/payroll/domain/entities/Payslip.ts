/** Liquidación — alineada con domain.Payslip del backend. */
export type Payslip = {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  gross: number;
  vacationProv: number;
  ssEmployer: number;
  ssWorker: number;
  otherDeduct: number;
  deductions: number;
  net: number;
  employerCost: number;
  currency: string;
  status: string;
  createdAt: string;
};

export type CreatePayslipInput = {
  employeeId: string;
  period?: string;
  gross?: number;
  otherDeduct?: number;
};
