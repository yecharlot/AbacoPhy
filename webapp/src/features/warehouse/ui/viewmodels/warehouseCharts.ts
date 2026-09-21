/** Agregaciones de presentación del almacén (sin reglas de costeo). */
import type { ChartPoint } from '../../../../infrastructure/ui/charts';
import { paletteColor } from '../../../../infrastructure/ui/charts';
import type { SalesUnit } from '../../domain/entities/SalesUnit';
import type { UnitStockRow, WarehouseStockRow } from '../../domain/entities/Stock';
import type { Reception } from '../../domain/entities/Reception';

export function topStockByValue(rows: WarehouseStockRow[], limit = 6): ChartPoint[] {
  return [...rows]
    .sort((a, b) => b.amountBase - a.amountBase)
    .slice(0, limit)
    .map((row, index) => ({
      label: row.code || row.name,
      value: row.amountBase,
      hint: row.name,
      color: paletteColor(index),
    }));
}

export function stockDistribution(
  rows: WarehouseStockRow[],
  unitStocks: UnitStockRow[],
  units: SalesUnit[],
): ChartPoint[] {
  const central = rows.reduce((acc, row) => acc + row.amountBase, 0);
  const points: ChartPoint[] = [{ label: 'Almacén central', value: central, color: paletteColor(0) }];

  const byUnit = new Map<string, number>();
  for (const stock of unitStocks) {
    byUnit.set(stock.unitId, (byUnit.get(stock.unitId) ?? 0) + stock.amountBase);
  }

  let index = 1;
  for (const [unitId, value] of byUnit.entries()) {
    if (value <= 0) continue;
    const unit = units.find((u) => u.id === unitId);
    points.push({ label: unit ? unit.name : unitId, value, color: paletteColor(index) });
    index += 1;
  }

  return points.filter((point) => point.value > 0);
}

export function receptionsSeries(receptions: Reception[], limit = 8): ChartPoint[] {
  const totals = new Map<string, number>();
  for (const reception of receptions) {
    const key = reception.date || '—';
    totals.set(key, (totals.get(key) ?? 0) + reception.totalCost);
  }
  return Array.from(totals.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-limit)
    .map(([label, value]) => ({ label: label.slice(5), value, hint: label }));
}
