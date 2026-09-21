import type { HttpClient } from '../../../../infrastructure/data/http';
import type { CreateSaleInput, Sale } from '../../domain/entities/Sale';
import type { SalesRepository } from '../../domain/repositories/SalesRepository';
import { createSaleInputToDto, saleDtoToEntity } from '../mappers/saleMapper';
import { SalesRemoteSource } from '../sources/SalesRemoteSource';

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export class SalesRepositoryImpl implements SalesRepository {
  private readonly remote: SalesRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new SalesRemoteSource(http);
  }

  async getSales(): Promise<Sale[]> {
    try {
      const dto = await this.remote.getSales();
      return (dto.sales || []).map(saleDtoToEntity);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudieron cargar las ventas'));
    }
  }

  async createSale(input: CreateSaleInput): Promise<Sale> {
    try {
      const dto = await this.remote.createSale(createSaleInputToDto(input));
      if (!dto.sale) throw new Error('Respuesta de venta vacía');
      return saleDtoToEntity(dto.sale);
    } catch (err) {
      throw new Error(messageOf(err, 'No se pudo registrar la venta'));
    }
  }
}
