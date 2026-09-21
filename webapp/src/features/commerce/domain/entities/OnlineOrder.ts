/** Pedido online de cliente final (módulo comercio). */
export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export type OnlineOrderLine = {
  productId: string;
  productCode: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type OnlineOrder = {
  id: string;
  number: string;
  customer: string;
  phone: string;
  address: string;
  status: string;
  lines: OnlineOrderLine[];
  total: number;
  currency: string;
  notes: string;
};

export type CreateOnlineOrderLineInput = {
  productId: string;
  qty: number;
  unitPrice?: number;
};

export type CreateOnlineOrderInput = {
  customer: string;
  phone?: string;
  address?: string;
  notes?: string;
  lines: CreateOnlineOrderLineInput[];
};

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'delivered', 'cancelled'];

export function orderStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'confirmed':
      return 'Confirmado';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}
