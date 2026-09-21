import type { HttpClient } from '../../../../infrastructure/data/http';
import type { CostSheet, SaveCostSheetInput } from '../../domain/entities/CostSheet';
import type { PriceSheet, SavePriceSheetInput } from '../../domain/entities/PriceSheet';
import type { CostingRepository } from '../../domain/repositories/CostingRepository';
import {
  costSheetDtoToEntity,
  priceSheetDtoToEntity,
  saveCostSheetInputToDto,
  savePriceSheetInputToDto,
} from '../mappers/costingMapper';
import { CostingRemoteSource } from '../sources/CostingRemoteSource';

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export class CostingRepositoryImpl implements CostingRepository {
  private readonly remote: CostingRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new CostingRemoteSource(http);
  }

  async getCostSheets(): Promise<CostSheet[]> {
    try {
      const dto = await this.remote.getCostSheets();
      return (dto.cost_sheets || []).map(costSheetDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las fichas de costo'));
    }
  }

  async saveCostSheet(input: SaveCostSheetInput): Promise<CostSheet> {
    try {
      const dto = await this.remote.saveCostSheet(saveCostSheetInputToDto(input));
      if (!dto.cost_sheet) throw new Error('Respuesta de ficha de costo vacía');
      return costSheetDtoToEntity(dto.cost_sheet);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo guardar la ficha de costo'));
    }
  }

  async getPriceSheets(): Promise<PriceSheet[]> {
    try {
      const dto = await this.remote.getPriceSheets();
      return (dto.sheets || []).map(priceSheetDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las fichas de precio'));
    }
  }

  async savePriceSheet(input: SavePriceSheetInput): Promise<PriceSheet> {
    try {
      const dto = await this.remote.savePriceSheet(savePriceSheetInputToDto(input));
      if (!dto.sheet) throw new Error('Respuesta de ficha de precio vacía');
      return priceSheetDtoToEntity(dto.sheet);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo guardar la ficha de precio'));
    }
  }

  async deletePriceSheet(id: string): Promise<void> {
    try {
      await this.remote.deletePriceSheet(id);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo eliminar la ficha de precio'));
    }
  }
}
