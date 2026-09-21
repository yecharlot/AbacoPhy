import type { OnlineOrder } from '../entities/OnlineOrder';
import type { CommerceRepository } from '../repositories/CommerceRepository';

export class ListOnlineOrders {
  constructor(private readonly repo: CommerceRepository) {}

  execute(): Promise<OnlineOrder[]> {
    return this.repo.getOrders();
  }
}
