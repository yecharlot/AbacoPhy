import type { CreateOnlineOrderInput, OnlineOrder } from '../entities/OnlineOrder';

export interface CommerceRepository {
  getOrders(): Promise<OnlineOrder[]>;
  createOrder(input: CreateOnlineOrderInput): Promise<OnlineOrder>;
  updateOrderStatus(id: string, status: string): Promise<void>;
}
