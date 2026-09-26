import type { AccountingRepository } from '../repositories/AccountingRepository';
import type { Entry } from '../entities/Entry';

export class ListEntries {
  constructor(private repository: AccountingRepository) {}

  async execute(params?: { type?: string; from?: string; to?: string; limit?: number }): Promise<Entry[]> {
    return this.repository.getEntries(params);
  }
}
