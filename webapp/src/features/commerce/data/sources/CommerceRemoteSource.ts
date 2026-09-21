import type { HttpClient } from '../../../../infrastructure/data/http';
import type { OnlineOrderResponseDto, OnlineOrdersResponseDto } from '../dto/OnlineOrderDto';

export class CommerceRemoteSource {
  constructor(private readonly http: HttpClient) {}

  getOrders(): Promise<OnlineOrdersResponseDto> {
    return this.http.get<OnlineOrdersResponseDto>('/online-orders');
  }

  createOrder(body: Record<string, unknown>): Promise<OnlineOrderResponseDto> {
    return this.http.post<OnlineOrderResponseDto>('/online-orders', body);
  }

  updateOrder(body: Record<string, unknown>): Promise<{ ok?: boolean }> {
    return this.http.put<{ ok?: boolean }>('/online-orders', body);
  }
}
