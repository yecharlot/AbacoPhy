import type { Entry } from '../entities/Entry';
import type { AccountingRepository } from '../repositories/AccountingRepository';

export class ListEntries {
  constructor(private readonly repo: AccountingRepository) {}

  execute(): Promise<Entry[]> {
    return this.repo.listEntries();
  }
}
