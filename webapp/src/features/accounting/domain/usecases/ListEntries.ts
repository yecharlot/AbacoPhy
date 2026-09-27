import type { Entry } from '../entities/Entry';
import type { AccountingRepository, EntriesQuery } from '../repositories/AccountingRepository';

export class ListEntries {
  constructor(private readonly repo: AccountingRepository) {}

  execute(params?: EntriesQuery): Promise<Entry[]> {
    return this.repo.listEntries(params);
  }
}
