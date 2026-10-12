import type { KardexSnapshot } from '../entities/Kardex';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

export class GetKardex {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(params: {
    productId?: string;
    location?: string;
    unitId?: string;
  }): Promise<KardexSnapshot> {
    return this.repo.getKardex(params);
  }
}
