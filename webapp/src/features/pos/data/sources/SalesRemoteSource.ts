import type { HttpClient } from '../../../../infrastructure/data/http';
import type { SaleResponseDto, SalesResponseDto } from '../dto/SaleDto';

export class SalesRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getSales(): Promise<SalesResponseDto> {
    return this.http.get<SalesResponseDto>('/pos/sales');
  }

  createSale(body: Record<string, unknown>): Promise<SaleResponseDto> {
    return this.http.post<SaleResponseDto>('/pos/sales', body);
  }
}
