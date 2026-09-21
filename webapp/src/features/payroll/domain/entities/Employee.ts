export type Employee = {
  id: string;
  name: string;
  idNumber: string;
  position: string;
  salary: number;
  active: boolean;
};

export type CreateEmployeeInput = {
  name: string;
  idNumber?: string;
  position?: string;
  salary: number;
};
