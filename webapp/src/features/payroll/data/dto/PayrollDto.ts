export type EmployeeDto = {
  id?: string;
  name?: string;
  id_number?: string;
  idNumber?: string;
  position?: string;
  salary?: number;
  active?: boolean;
};

export type EmployeesResponseDto = {
  employees?: EmployeeDto[];
  trabajadores?: EmployeeDto[];
};

export type CreateEmployeeRequestDto = {
  name: string;
  id_number?: string;
  position?: string;
  salary: number;
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
};

export type PayslipsResponseDto = {
  payslips?: PayslipDto[];
  liquidaciones?: PayslipDto[];
};

export type CreatePayslipRequestDto = {
  employee_id: string;
  period: string;
  gross: number;
  deductions?: number;
  status?: string;
};
