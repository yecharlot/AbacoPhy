/** Agregaciones de presentación de pedidos online. */
import type { ChartPoint } from '../../../../infrastructure/ui/charts';
import { paletteColor } from '../../../../infrastructure/ui/charts';
import { ORDER_STATUSES, orderStatusLabel, type OnlineOrder } from '../../domain/entities/OnlineOrder';

export function ordersByStatus(orders: OnlineOrder[]): ChartPoint[] {
  return ORDER_STATUSES.map((status, index) => ({
    label: orderStatusLabel(status),
    value: orders.filter((order) => order.status === status).length,
    color: paletteColor(index),
  })).filter((point) => point.value > 0);
}

export function orderedAmountByStatus(orders: OnlineOrder[]): ChartPoint[] {
  return ORDER_STATUSES.map((status, index) => ({
    label: orderStatusLabel(status),
    value: orders
      .filter((order) => order.status === status)
      .reduce((acc, order) => acc + order.total, 0),
    color: paletteColor(index),
  })).filter((point) => point.value > 0);
}

export function topRequestedProducts(orders: OnlineOrder[], limit = 6): ChartPoint[] {
  const totals = new Map<string, number>();
  for (const order of orders) {
    for (const line of order.lines) {
      const key = line.productCode || line.productName || line.productId;
      totals.set(key, (totals.get(key) ?? 0) + line.lineTotal);
    }
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value], index) => ({ label, value, color: paletteColor(index) }));
}
