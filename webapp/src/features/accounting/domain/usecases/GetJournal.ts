import type { AccountingRepository } from '../repositories/AccountingRepository';
import type { JournalEntry } from '../entities/JournalEntry';

export class GetJournal {
    constructor(private repository: AccountingRepository) {}

    async execute(params?: { limit?: number }): Promise<JournalEntry[]> {
        return this.repository.getJournal(params);
    }
}