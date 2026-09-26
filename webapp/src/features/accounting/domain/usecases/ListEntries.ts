import type { AccountingRepository, EntriesQuery } from '../repositories/AccountingRepository';
import type { Entry } from '../entities/Entry';

export class ListEntries {
  constructor(private repository: AccountingRepository) {}

  async execute(params?: EntriesQuery): Promise<Entry[]> {
    return this.repository.getEntries(params);
  }
}
