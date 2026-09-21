import type { Product, CreateProductInput } from '../entities/Product';
import type { CatalogRepository } from '../repositories/CatalogRepository';

export class CreateProduct {
  constructor(private readonly repo: CatalogRepository) {}

  execute(input: CreateProductInput): Promise<Product> {
    return this.repo.createProduct(input);
  }
}
