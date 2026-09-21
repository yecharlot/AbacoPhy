export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonus: number;
  deductions: number;
  totalNet: number;
  currency: string;
  dateEmitted: string;
}
