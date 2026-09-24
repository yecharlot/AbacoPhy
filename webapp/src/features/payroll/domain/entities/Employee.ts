/** Trabajador — alineado con domain.Employee del backend Go. */
export type Employee = {
  id: string;
  name: string;
  ci: string;
  role: string;
  department: string;
  hireDate: string;
  salary: number;
  currency: string;
  vacRate: number;
  ssEmployerRate: number;
  ssWorkerRate: number;
  active: boolean;
};

export type CreateEmployeeInput = {
  name: string;
  ci?: string;
  role?: string;
  department?: string;
  hireDate?: string;
  salary: number;
  currency?: string;
  vacRate?: number;
  ssEmployerRate?: number;
  ssWorkerRate?: number;
};
