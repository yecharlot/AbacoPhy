import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  ReceptionResponseDto,
  ReceptionsResponseDto,
  SalesUnitResponseDto,
  SalesUnitsResponseDto,
  TransferResponseDto,
  TransfersResponseDto,
  WarehouseResponseDto,
} from '../dto/WarehouseDto';

export class WarehouseRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getWarehouse(): Promise<WarehouseResponseDto> {
    return this.http.get<WarehouseResponseDto>('/warehouse');
  }

  getSalesUnits(): Promise<SalesUnitsResponseDto> {
    return this.http.get<SalesUnitsResponseDto>('/units');
  }

  createSalesUnit(body: Record<string, unknown>): Promise<SalesUnitResponseDto> {
    return this.http.post<SalesUnitResponseDto>('/units', body);
  }

  getReceptions(): Promise<ReceptionsResponseDto> {
    return this.http.get<ReceptionsResponseDto>('/receptions');
  }

  createReception(body: Record<string, unknown>): Promise<ReceptionResponseDto> {
    return this.http.post<ReceptionResponseDto>('/receptions', body);
  }

  getTransfers(): Promise<TransfersResponseDto> {
    return this.http.get<TransfersResponseDto>('/transfers');
  }

  createTransfer(body: Record<string, unknown>): Promise<TransferResponseDto> {
    return this.http.post<TransferResponseDto>('/transfers', body);
  }
}
