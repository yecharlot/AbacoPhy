import type { MeasureUnit } from '../entities/MeasureUnit';
import type { CatalogRepository } from '../repositories/CatalogRepository';

export class GetMeasureUnits {
  constructor(private readonly repo: CatalogRepository) {}

  execute(): Promise<MeasureUnit[]> {
    return this.repo.getMeasureUnits();
  }
}
