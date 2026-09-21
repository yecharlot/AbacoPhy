export type AccountDto = {
  id: string;
  code?: string;
  name?: string;
  type?: string;
  balance?: number;
};

export type AccountsResponseDto = {
  accounts?: AccountDto[];
  rev?: number;
};

export type EntryDto = {
  id?: string;
  type?: string;
  account_id?: string;
  amount?: number;
  description?: string;
  counterpart?: string;
  date?: string;
  currency?: string;
};

export type EntriesResponseDto = {
  entries?: EntryDto[];
  asientos?: EntryDto[];
  rev?: number;
};

export type CreateEntryRequestDto = {
  type: 'income' | 'expense';
  account_id: string;
  amount: number;
  description: string;
  counterpart?: string;
  date?: string;
  currency?: string;
};

export type EquationDto = {
  activo?: number;
  pasivo?: number;
  patrimonio?: number;
  ingresos?: number;
  gastos?: number;
  neto?: number;
  pasivo_patrimonio_neto?: number;
};

export type CreateEntryResponseDto = {
  asiento?: EntryDto;
  entry?: EntryDto;
  ecuacion?: EquationDto;
  rev?: number;
  root_cid?: string;
};

export type SummaryResponseDto = {
  ingresos?: number;
  gastos?: number;
  neto?: number;
  income?: number;
  expense?: number;
  ecuacion?: EquationDto;
  equation?: EquationDto;
  rev?: number;
  root_cid?: string;
};
