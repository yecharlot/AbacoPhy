/**
 * @deprecated El backend no expone este shape.
 * Libro diario = EntryDto vía GET /entries (fases 5–6).
 * Mapper: reportsMapper.entryToJournal(EntryDto).
 */
export type JournalEntryDto = {
  id: string;
  date: string;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  type: string;
};
