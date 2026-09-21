import type { CreateOnlineOrderInput, OnlineOrder } from '../entities/OnlineOrder';
import type { CommerceRepository } from '../repositories/CommerceRepository';

export class CreateOnlineOrder {
  constructor(private readonly repo: CommerceRepository) {}

  execute(input: CreateOnlineOrderInput): Promise<OnlineOrder> {
    const customer = input.customer.trim();
    if (!customer) {
      return Promise.reject(new Error('El nombre del cliente es obligatorio'));
    }
    if (input.lines.length === 0) {
      return Promise.reject(new Error('El pedido necesita al menos una línea'));
    }
    for (const line of input.lines) {
      if (!line.productId) {
        return Promise.reject(new Error('Cada línea necesita un producto'));
      }
      if (line.qty <= 0) {
        return Promise.reject(new Error('La cantidad debe ser mayor que cero'));
      }
      if (line.unitPrice !== undefined && line.unitPrice < 0) {
        return Promise.reject(new Error('El precio no puede ser negativo'));
      }
    }
    return this.repo.createOrder({ ...input, customer });
  }
}
