import type { CatalogRepository } from '../repositories/CatalogRepository';

export class DeleteMeasureUnit {
  constructor(private readonly repo: CatalogRepository) {}

  execute(id: string): Promise<void> {
    return this.repo.deleteMeasureUnit(id);
  }
}
