import type { MeasureUnit, CreateMeasureUnitInput } from '../entities/MeasureUnit';
import type { CatalogRepository } from '../repositories/CatalogRepository';

export class CreateMeasureUnit {
  constructor(private readonly repo: CatalogRepository) {}

  execute(input: CreateMeasureUnitInput): Promise<MeasureUnit> {
    return this.repo.createMeasureUnit(input);
  }
}
