/** Trabajador del negocio (tenant actual). */
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
  /**
   * Unidades de venta del negocio donde puede operar (puntos de emisión).
   * No es multi-tenant: el empleado pertenece al negocio de la sesión.
   */
  unitIds: string[];
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
  unitIds?: string[];
};

export type UpdateEmployeeInput = {
  id: string;
  name?: string;
  ci?: string;
  role?: string;
  department?: string;
  hireDate?: string;
  salary?: number;
  currency?: string;
  vacRate?: number;
  ssEmployerRate?: number;
  ssWorkerRate?: number;
  active?: boolean;
  unitIds?: string[];
};
