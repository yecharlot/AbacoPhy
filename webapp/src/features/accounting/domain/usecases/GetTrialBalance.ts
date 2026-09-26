import type { AccountingRepository } from '../repositories/AccountingRepository';
import type { TrialBalance } from '../entities/TrialBalance';

export class GetTrialBalance {
    constructor(private repository: AccountingRepository) {}

    async execute(): Promise<TrialBalance> {
        return this.repository.getTrialBalance();
    }
}