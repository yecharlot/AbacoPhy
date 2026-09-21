export type PayslipStatus = 'draft' | 'paid' | 'cancelled';

export type Payslip = {
  id: string;
  employeeId: string;
  employeeName?: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
  status: PayslipStatus;
};

export type CreatePayslipInput = {
  employeeId: string;
  period: string;
  gross: number;
  deductions?: number;
  status?: PayslipStatus;
};
