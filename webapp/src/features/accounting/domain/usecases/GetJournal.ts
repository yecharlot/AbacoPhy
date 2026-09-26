import type { AccountingRepository, EntriesQuery } from '../repositories/AccountingRepository';
import type { JournalEntry } from '../entities/JournalEntry';

export class GetJournal {
  constructor(private repository: AccountingRepository) {}

  async execute(params?: EntriesQuery): Promise<JournalEntry[]> {
    return this.repository.getJournal(params);
  }
}
