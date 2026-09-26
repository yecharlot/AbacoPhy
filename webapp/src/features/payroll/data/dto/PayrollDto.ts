export type EmployeeDto = {
  id?: string;
  name?: string;
  id_number?: string;
  idNumber?: string;
  position?: string;
  salary?: number;
  active?: boolean;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type EmployeesResponseDto = {
  employees?: EmployeeDto[];
  trabajadores?: EmployeeDto[];
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateEmployeeRequestDto = {
  name: string;
  id_number?: string;
  position?: string;
  salary: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type PayslipDto = {
  id?: string;
  employee_id?: string;
  employeeId?: string;
  employee_name?: string;
  employeeName?: string;
  period?: string;
  gross?: number;
  deductions?: number;
  net?: number;
  status?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type PayslipsResponseDto = {
  payslips?: PayslipDto[];
  liquidaciones?: PayslipDto[];
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreatePayslipRequestDto = {
  employee_id: string;
  period: string;
  gross: number;
  deductions?: number;
  status?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
