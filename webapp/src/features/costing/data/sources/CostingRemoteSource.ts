import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  CostSheetResponseDto,
  CostSheetsResponseDto,
  PriceSheetResponseDto,
  PriceSheetsResponseDto,
} from '../dto/CostingDto';

export class CostingRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getCostSheets(): Promise<CostSheetsResponseDto> {
    return this.http.get<CostSheetsResponseDto>('/cost-sheets');
  }

  saveCostSheet(body: Record<string, unknown>): Promise<CostSheetResponseDto> {
    return this.http.post<CostSheetResponseDto>('/cost-sheets', body);
  }

  getPriceSheets(): Promise<PriceSheetsResponseDto> {
    return this.http.get<PriceSheetsResponseDto>('/price-sheets');
  }

  savePriceSheet(body: Record<string, unknown>): Promise<PriceSheetResponseDto> {
    return this.http.post<PriceSheetResponseDto>('/price-sheets', body);
  }

  deletePriceSheet(id: string): Promise<void> {
    return this.http.delete<void>(`/price-sheets?id=${encodeURIComponent(id)}`);
  }
}
