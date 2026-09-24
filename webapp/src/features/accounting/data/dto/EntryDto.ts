/** Contrato API (snake_case). Go usa `description`, no `concept`. */
export type EntryDto = {
  id: string;
  date: string;
  type: string;
  amount: number;
  currency: string;
  account_id: string;
  account_name?: string;
  /** Campo de dominio legacy en FE; la API real usa description. */
  concept?: string;
  description?: string;
  category?: string;
  tags?: string[];
  counterpart?: string;
};
