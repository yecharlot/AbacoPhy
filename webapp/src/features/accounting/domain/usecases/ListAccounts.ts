import type { AccountingRepository } from '../repositories/AccountingRepository';
import type { Account } from '../entities/Account';

export class ListAccounts {
  constructor(private repository: AccountingRepository) {}

  async execute(): Promise<Account[]> {
    return this.repository.getAccounts();
  }
}
