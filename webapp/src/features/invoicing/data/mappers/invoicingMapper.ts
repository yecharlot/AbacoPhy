import type { InvoiceDto, InvoiceLineDto } from '../dto/InvoiceDto';
import type { Invoice } from '../../domain/entities/Invoice';
import type { InvoiceLine } from '../../domain/entities/InvoiceLine';

export const invoicingMapper = {
  toEntity(dto: InvoiceDto): Invoice {
    return {
      id: dto.id,
      number: dto.number,
      date: dto.date,
      customerId: dto.customer_id,
      customerName: dto.customer_name,
      lines: (dto.lines || []).map(l => ({
        productId: l.product_id,
        productName: l.product_name,
        quantity: l.quantity,
        price: l.price,
        total: l.total,
      })),
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.total,
      currency: dto.currency,
      status: dto.status as any,
    };
  },

  toEmitDto(entity: Omit<Invoice, 'id' | 'number' | 'status'>): Partial<InvoiceDto> {
    return {
      date: entity.date,
      customer_id: entity.customerId,
      customer_name: entity.customerName,
      lines: entity.lines.map(l => ({
        product_id: l.productId,
        product_name: l.productName,
        quantity: l.quantity,
        price: l.price,
        total: l.total,
      })),
      currency: entity.currency,
    };
  },
};
