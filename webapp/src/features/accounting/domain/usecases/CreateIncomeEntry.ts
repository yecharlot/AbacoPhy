import type { CreateEntryInput } from '../entities/Entry';
import type { AccountingRepository, CreateEntryResult } from '../repositories/AccountingRepository';

export class CreateIncomeEntry {
  constructor(private readonly repo: AccountingRepository) {}

  async execute(input: Omit<CreateEntryInput, 'type'>): Promise<CreateEntryResult> {
    if (!input.accountId) throw new Error('Seleccione una cuenta de ingreso');
    if (!(input.amount > 0)) throw new Error('El importe debe ser mayor que 0');
    if (!input.description?.trim()) throw new Error('Indique una descripción');
    return this.repo.createEntry({
      ...input,
      type: 'income',
      description: input.description.trim(),
    });
  }
}
