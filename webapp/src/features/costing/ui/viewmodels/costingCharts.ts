/** Agregaciones de presentación de fichas de costo y precio. */
import type { ChartPoint } from '../../../../infrastructure/ui/charts';
import { paletteColor } from '../../../../infrastructure/ui/charts';
import type { CostSheet } from '../../domain/entities/CostSheet';
import type { PriceSheet } from '../../domain/entities/PriceSheet';

/** Estructura de una ficha: elementos de costo que el backend ya calculó. */
export function costStructure(sheet: CostSheet | null): ChartPoint[] {
  if (!sheet) return [];
  const rows: Array<[string, number]> = [
    ['Materia prima', sheet.materiaPrima],
    ['Auxiliares', sheet.materialesAuxiliares],
    ['Energía', sheet.energia],
    ['Salario directo', sheet.salarioDirecto],
    ['Otros directos', sheet.otrosDirectos],
    ['Indirectos', sheet.gastosIndirectos],
  ];
  return rows
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({ label, value, color: paletteColor(index) }));
}

export function costPerProduct(sheets: CostSheet[], limit = 6): ChartPoint[] {
  return [...sheets]
    .sort((a, b) => b.costoUnitario - a.costoUnitario)
    .slice(0, limit)
    .map((sheet, index) => ({
      label: sheet.productCode || sheet.productName,
      value: sheet.costoUnitario,
      hint: sheet.productName,
      color: paletteColor(index),
    }));
}

/** Margen (precio − costo referencia) por ficha de precio. */
export function marginByProduct(sheets: PriceSheet[], limit = 6): ChartPoint[] {
  return [...sheets]
    .map((sheet) => ({
      label: sheet.productCode || sheet.productName,
      value: Math.max(0, sheet.price - sheet.costRef),
      hint: sheet.productName,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((point, index) => ({ ...point, color: paletteColor(index) }));
}
