import { ORDER_STATUSES, type OrderStatus } from '../entities/OnlineOrder';
import type { CommerceRepository } from '../repositories/CommerceRepository';

export class UpdateOrderStatus {
  constructor(private readonly repo: CommerceRepository) {}

  execute(id: string, status: OrderStatus): Promise<void> {
    if (!id) {
      return Promise.reject(new Error('Pedido no válido'));
    }
    if (!ORDER_STATUSES.includes(status)) {
      return Promise.reject(new Error('Estado de pedido no permitido'));
    }
    return this.repo.updateOrderStatus(id, status);
  }
}
