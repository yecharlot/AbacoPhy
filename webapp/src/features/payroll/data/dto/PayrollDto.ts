export interface EmployeeDto {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  identity_card: string;
  position: string;
  salary_base: number;
  currency: string;
  hiring_date: string;
  active: boolean;
}

export interface PayslipDto {
  id: string;
  employee_id: string;
  employee_name: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  bonus: number;
  deductions: number;
  total_net: number;
  currency: string;
  date_emitted: string;
}
