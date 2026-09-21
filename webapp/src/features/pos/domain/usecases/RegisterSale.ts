import type { CreateSaleInput, Sale } from '../entities/Sale';
import type { SalesRepository } from '../repositories/SalesRepository';

/**
 * Valida el ticket antes de enviarlo. Totales, costo de venta e ingreso contable
 * son reglas del backend.
 */
export class RegisterSale {
  constructor(private readonly repo: SalesRepository) {}

  execute(input: CreateSaleInput): Promise<Sale> {
    if (input.lines.length === 0) {
      return Promise.reject(new Error('La venta necesita al menos una línea'));
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
      if (line.discountPct !== undefined && (line.discountPct < 0 || line.discountPct > 100)) {
        return Promise.reject(new Error('La rebaja debe estar entre 0 y 100 %'));
      }
    }
    return this.repo.createSale(input);
  }
}
