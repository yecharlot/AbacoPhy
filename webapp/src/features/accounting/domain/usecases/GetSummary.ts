import type { Summary } from '../entities/Equation';
import type { AccountingRepository } from '../repositories/AccountingRepository';

export class GetSummary {
  constructor(private readonly repo: AccountingRepository) {}

  execute(): Promise<Summary> {
    return this.repo.getSummary();
  }
}
