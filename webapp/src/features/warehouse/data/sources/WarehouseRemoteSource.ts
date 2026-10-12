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

  /** Entrada física: pendiente_entrada → entrado + WarehouseStock; accept=false registra incidencia. */
  enterReception(body: Record<string, unknown>): Promise<ReceptionResponseDto> {
    return this.http.post<ReceptionResponseDto>('/receptions/enter', body);
  }

  getTransfers(): Promise<TransfersResponseDto> {
    return this.http.get<TransfersResponseDto>('/transfers');
  }

  createTransfer(body: Record<string, unknown>): Promise<TransferResponseDto> {
    return this.http.post<TransferResponseDto>('/transfers', body);
  }
  getKardex(params: {
    productId?: string;
    location?: string;
    unitId?: string;
  }): Promise<Record<string, unknown>> {
    const q = new URLSearchParams();
    if (params.productId) q.set('product_id', params.productId);
    if (params.location) q.set('location', params.location);
    if (params.unitId) q.set('unit_id', params.unitId);
    const qs = q.toString();
    return this.http.get<Record<string, unknown>>(`/kardex${qs ? `?${qs}` : ''}`);
  }

  adjustStock(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/inventory/adjust', body);
  }

  reconcileStock(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/inventory/reconcile');
  }

}
