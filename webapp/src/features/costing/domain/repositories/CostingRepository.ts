import type { CostSheet, SaveCostSheetInput } from '../entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../entities/PriceSheet';

export interface CostingRepository {
  getCostSheets(): Promise<CostSheet[]>;
  saveCostSheet(input: SaveCostSheetInput): Promise<CostSheet>;
  getPriceSheets(): Promise<PriceSheet[]>;
  savePriceSheet(input: SavePriceSheetInput): Promise<PriceSheet>;
  deletePriceSheet(id: string): Promise<void>;
}
