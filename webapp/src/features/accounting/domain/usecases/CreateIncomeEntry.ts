import type { AccountingRepository } from '../repositories/AccountingRepository';
import type { Entry } from '../entities/Entry';

export class CreateIncomeEntry {
  constructor(private repository: AccountingRepository) {}

  async execute(entry: Omit<Entry, 'id' | 'type'>): Promise<Entry> {
    return this.repository.createEntry({
      ...entry,
      type: 'income',
    });
  }
}
