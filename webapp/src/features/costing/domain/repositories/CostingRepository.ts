import type { CostSheet, SaveCostSheetInput } from '../entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../entities/PriceSheet';

export interface CostingRepository {
  getCostSheets(): Promise<CostSheet[]>;
  saveCostSheet(input: SaveCostSheetInput): Promise<CostSheet>;
  deleteCostSheet(productId: string): Promise<void>;
  getPriceSheets(): Promise<PriceSheet[]>;
  savePriceSheet(input: SavePriceSheetInput): Promise<PriceSheet>;
  deletePriceSheet(id: string): Promise<void>;
}
