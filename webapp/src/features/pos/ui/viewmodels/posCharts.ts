/** Agregaciones de presentación del punto de venta. */
import type { ChartPoint } from '../../../../infrastructure/ui/charts';
import { paletteColor } from '../../../../infrastructure/ui/charts';
import type { Sale } from '../../domain/entities/Sale';

export function salesByDay(sales: Sale[], days = 7): ChartPoint[] {
  const totals = new Map<string, number>();
  for (const sale of sales) {
    const key = sale.date || '—';
    totals.set(key, (totals.get(key) ?? 0) + sale.total);
  }
  return Array.from(totals.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-days)
    .map(([label, value]) => ({ label: label.slice(5), value, hint: label }));
}

export function salesByUnit(sales: Sale[]): ChartPoint[] {
  const totals = new Map<string, number>();
  for (const sale of sales) {
    const key = sale.unitName || 'Almacén central';
    totals.set(key, (totals.get(key) ?? 0) + sale.total);
  }
  return Array.from(totals.entries())
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({ label, value, color: paletteColor(index) }));
}

export function topSoldProducts(sales: Sale[], limit = 6): ChartPoint[] {
  const totals = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      const key = line.productCode || line.productName || line.productId;
      totals.set(key, (totals.get(key) ?? 0) + line.lineTotal);
    }
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value], index) => ({ label, value, color: paletteColor(index) }));
}

export function salesTotals(sales: Sale[]): { total: number; discount: number; cost: number; margin: number } {
  const total = sales.reduce((acc, sale) => acc + sale.total, 0);
  const discount = sales.reduce((acc, sale) => acc + sale.discount, 0);
  const cost = sales.reduce((acc, sale) => acc + sale.costTotal, 0);
  return { total, discount, cost, margin: total - cost };
}
