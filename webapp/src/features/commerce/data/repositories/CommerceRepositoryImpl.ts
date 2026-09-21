import type { HttpClient } from '../../../../infrastructure/data/http';
import type { CreateOnlineOrderInput, OnlineOrder } from '../../domain/entities/OnlineOrder';
import type { CommerceRepository } from '../../domain/repositories/CommerceRepository';
import { createOnlineOrderInputToDto, onlineOrderDtoToEntity } from '../mappers/commerceMapper';
import { CommerceRemoteSource } from '../sources/CommerceRemoteSource';

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export class CommerceRepositoryImpl implements CommerceRepository {
  private readonly remote: CommerceRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new CommerceRemoteSource(http);
  }

  async getOrders(): Promise<OnlineOrder[]> {
    try {
      const dto = await this.remote.getOrders();
      return (dto.orders || []).map(onlineOrderDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar los pedidos online'));
    }
  }

  async createOrder(input: CreateOnlineOrderInput): Promise<OnlineOrder> {
    try {
      const dto = await this.remote.createOrder(createOnlineOrderInputToDto(input));
      if (!dto.order) throw new Error('Respuesta de pedido vacía');
      return onlineOrderDtoToEntity(dto.order);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo registrar el pedido'));
    }
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    try {
      await this.remote.updateOrder({ id, status });
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo actualizar el estado del pedido'));
    }
  }
}
