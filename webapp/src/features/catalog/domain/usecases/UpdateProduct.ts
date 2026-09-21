import type { Product, UpdateProductInput } from '../entities/Product';
import type { CatalogRepository } from '../repositories/CatalogRepository';

export class UpdateProduct {
  constructor(private readonly repo: CatalogRepository) {}

  execute(input: UpdateProductInput): Promise<Product> {
    return this.repo.updateProduct(input);
  }
}
