import type { EmitInvoiceInput, EmitInvoiceResult } from '../entities/Invoice';
import type { InvoiceRepository } from '../repositories/InvoiceRepository';

export class EmitInvoice {
  constructor(private readonly repo: InvoiceRepository) {}

  async execute(input: EmitInvoiceInput): Promise<EmitInvoiceResult> {
    if (!input.clientName?.trim()) {
      throw new Error('Indique el nombre del cliente');
    }
    if (!input.lines?.length) {
      throw new Error('Añada al menos una línea');
    }
    for (const line of input.lines) {
      if (!line.description?.trim()) throw new Error('Cada línea necesita descripción');
      if (!(line.qty > 0)) throw new Error('La cantidad debe ser mayor que 0');
      if (!(line.unitPrice >= 0)) throw new Error('El precio unitario no puede ser negativo');
    }
    return this.repo.emit({
      ...input,
      clientName: input.clientName.trim(),
      status: input.status ?? 'issued',
    });
  }
}
