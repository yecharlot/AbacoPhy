export type AccountDto = {
  id: string;
  code?: string;
  name?: string;
  type?: string;
  balance?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type AccountsResponseDto = {
  accounts?: AccountDto[];
  rev?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type EntriesResponseDto = {
  entries?: EntryDto[];
  asientos?: EntryDto[];
  rev?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateEntryRequestDto = {
  type: 'income' | 'expense';
  account_id: string;
  amount: number;
  description: string;
  counterpart?: string;
  date?: string;
  currency?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type EquationDto = {
  activo?: number;
  pasivo?: number;
  patrimonio?: number;
  ingresos?: number;
  gastos?: number;
  neto?: number;
  pasivo_patrimonio_neto?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateEntryResponseDto = {
  asiento?: EntryDto;
  entry?: EntryDto;
  ecuacion?: EquationDto;
  rev?: number;
  root_cid?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
