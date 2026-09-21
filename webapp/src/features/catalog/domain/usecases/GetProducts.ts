import type { Product } from '../entities/Product';
import type { CatalogRepository } from '../repositories/CatalogRepository';

export class GetProducts {
  constructor(private readonly repo: CatalogRepository) {}

  execute(): Promise<Product[]> {
    return this.repo.getProducts();
  }
}
