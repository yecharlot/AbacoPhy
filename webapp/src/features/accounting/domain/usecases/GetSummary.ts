import type { AccountingRepository } from '../repositories/AccountingRepository';
import type { Equation } from '../entities/Equation';

export class GetSummary {
  constructor(private repository: AccountingRepository) {}

  async execute(): Promise<Equation> {
    return this.repository.getSummary();
  }
}
