import type { Account } from '../entities/Account';
import type { AccountingRepository } from '../repositories/AccountingRepository';

export class ListAccounts {
  constructor(private readonly repo: AccountingRepository) {}

  execute(): Promise<Account[]> {
    return this.repo.listAccounts();
  }
}
