import type { CreateReceptionInput, Reception } from '../entities/Reception';
import type { WarehouseRepository } from '../repositories/WarehouseRepository';

/**
 * Solo el rol económico registra el IR.
 * Contabilidad (cuenta inventario) en backend; stock físico tras entrada del almacenero.
 */
export class CreateReception {
  constructor(private readonly repo: WarehouseRepository) {}

  execute(input: CreateReceptionInput): Promise<Reception> {
    if (!input.receiver?.trim()) {
      return Promise.reject(new Error('Indique quién recibe la mercancía'));
    }
    if (input.hasInvoice) {
      const ref = (input.invoiceRef || input.docRef || '').trim();
      if (!ref) {
        return Promise.reject(new Error('Compra con factura: indique el número de factura'));
      }
      if (!input.supplier?.trim()) {
        return Promise.reject(new Error('Compra con factura: indique el proveedor'));
      }
    }
    if (input.lines.length === 0) {
      return Promise.reject(new Error('La recepción necesita al menos una línea'));
    }
    for (const line of input.lines) {
      if (!line.productId) {
        return Promise.reject(new Error('Cada línea necesita un producto'));
      }
      if (line.qty <= 0) {
        return Promise.reject(new Error('La cantidad debe ser mayor que cero'));
      }
      if (line.unitCost < 0) {
        return Promise.reject(new Error('El costo unitario no puede ser negativo'));
      }
    }
    return this.repo.createReception(input);
  }
}
