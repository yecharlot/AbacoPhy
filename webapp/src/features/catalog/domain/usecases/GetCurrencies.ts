import type { Currency } from '../entities/Currency';
import type { CatalogRepository } from '../repositories/CatalogRepository';

export class GetCurrencies {
  constructor(private readonly repo: CatalogRepository) {}

  execute(): Promise<Currency[]> {
    return this.repo.getCurrencies();
  }
}
