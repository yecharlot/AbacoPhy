import type { CreateSaleInput, Sale } from '../entities/Sale';

export interface SalesRepository {
  getSales(): Promise<Sale[]>;
  createSale(input: CreateSaleInput): Promise<Sale>;
}
