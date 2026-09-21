import type { HttpClient } from '../../../../infrastructure/data/http';
import type { ProductsResponseDto, ProductDto, MeasureUnitsResponseDto, MeasureUnitDto, CurrenciesResponseDto } from '../dto/CatalogDto';

export class CatalogRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getProducts(): Promise<ProductsResponseDto> {
    return this.http.get<ProductsResponseDto>('/products');
  }

  createProduct(body: Record<string, unknown>): Promise<ProductDto> {
    return this.http.post<ProductDto>('/products', body);
  }

  updateProduct(body: Record<string, unknown>): Promise<ProductDto> {
    return this.http.put<ProductDto>('/products', body);
  }

  getMeasureUnits(): Promise<MeasureUnitsResponseDto> {
    return this.http.get<MeasureUnitsResponseDto>('/measure-units');
  }

  createMeasureUnit(body: Record<string, unknown>): Promise<MeasureUnitDto> {
    return this.http.post<MeasureUnitDto>('/measure-units', body);
  }

  deleteMeasureUnit(id: string): Promise<void> {
    return this.http.delete<void>(`/measure-units?id=${encodeURIComponent(id)}`);
  }

  getCurrencies(): Promise<CurrenciesResponseDto> {
    return this.http.get<CurrenciesResponseDto>('/currencies');
  }
}
