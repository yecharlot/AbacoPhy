import type { HttpClient } from '../../../../infrastructure/data/http';
import type { WarehouseSnapshot } from '../../domain/entities/Stock';
import type {
  CreateSalesUnitInput,
  SalesUnit,
  SalesUnitsSnapshot,
} from '../../domain/entities/SalesUnit';
import type { CreateReceptionInput, Reception } from '../../domain/entities/Reception';
import type { CreateTransferInput, Transfer } from '../../domain/entities/Transfer';
import type { WarehouseRepository } from '../../domain/repositories/WarehouseRepository';
import {
  createReceptionInputToDto,
  enterReceptionInputToDto,
  createSalesUnitInputToDto,
  createTransferInputToDto,
  receptionDtoToEntity,
  salesUnitDtoToEntity,
  transferDtoToEntity,
  unitStockDtoToEntity,
  warehouseRowDtoToEntity,
} from '../mappers/warehouseMapper';
import { WarehouseRemoteSource } from '../sources/WarehouseRemoteSource';

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export class WarehouseRepositoryImpl implements WarehouseRepository {
  private readonly remote: WarehouseRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new WarehouseRemoteSource(http);
  }

  async getStock(): Promise<WarehouseSnapshot> {
    try {
      const dto = await this.remote.getWarehouse();
      return {
        rows: (dto.warehouse || []).map(warehouseRowDtoToEntity),
        unitStocks: (dto.unit_stocks || []).map(unitStockDtoToEntity),
      };
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las existencias del almacén'));
    }
  }

  async getSalesUnits(): Promise<SalesUnitsSnapshot> {
    try {
      const dto = await this.remote.getSalesUnits();
      return {
        units: (dto.units || []).map(salesUnitDtoToEntity),
        stocks: (dto.stocks || []).map(unitStockDtoToEntity),
      };
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las unidades de venta'));
    }
  }

  async createSalesUnit(input: CreateSalesUnitInput): Promise<SalesUnit> {
    try {
      const dto = await this.remote.createSalesUnit(createSalesUnitInputToDto(input));
      if (!dto.unit) throw new Error('Respuesta de unidad de venta vacía');
      return salesUnitDtoToEntity(dto.unit);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo crear la unidad de venta'));
    }
  }

  async getReceptions(): Promise<Reception[]> {
    try {
      const dto = await this.remote.getReceptions();
      return (dto.receptions || []).map(receptionDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar los informes de recepción'));
    }
  }

  async createReception(input: CreateReceptionInput): Promise<Reception> {
    try {
      const dto = await this.remote.createReception(createReceptionInputToDto(input));
      if (!dto.reception) throw new Error('Respuesta de recepción vacía');
      return receptionDtoToEntity(dto.reception);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo registrar el informe de recepción'));
    }
  }

  async enterReception(input: import('../../domain/entities/Reception').EnterReceptionInput): Promise<Reception> {
    try {
      const dto = await this.remote.enterReception(enterReceptionInputToDto(input));
      if (!dto.reception) throw new Error('Respuesta de entrada vacía');
      return receptionDtoToEntity(dto.reception);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo dar entrada al almacén'));
    }
  }

  async getTransfers(): Promise<Transfer[]> {
    try {
      const dto = await this.remote.getTransfers();
      return (dto.transfers || []).map(transferDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las transferencias'));
    }
  }

  async createTransfer(input: CreateTransferInput): Promise<Transfer> {
    try {
      const dto = await this.remote.createTransfer(createTransferInputToDto(input));
      if (!dto.transfer) throw new Error('Respuesta de transferencia vacía');
      return transferDtoToEntity(dto.transfer);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo confirmar la transferencia'));
    }
  }
}
