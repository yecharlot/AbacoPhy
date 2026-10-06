import type { Product } from '../../../catalog/domain/entities/Product';
import type { CostSheet } from '../../domain/entities/CostSheet';
import { paletteColor, type ChartPoint } from '../../../../infrastructure/ui/charts';

/** Factor por defecto nivel 1–5 (alineado con backend DefaultDifficultyFactor). */
export function defaultDifficultyFactor(level: number): number {
  if (level <= 0) return 1;
  if (level === 1) return 1;
  if (level === 2) return 1.1;
  if (level === 3) return 1.25;
  if (level === 4) return 1.5;
  return 1.8;
}

/** Costo unitario vigente: ficha (compuesto) o costStd (base / sin ficha). */
export function productUnitCost(
  productId: string,
  products: Product[],
  sheets: CostSheet[],
): number {
  const sheet = sheets.find((s) => s.productId === productId);
  if (sheet && sheet.costoUnitario > 0) return sheet.costoUnitario;
  const p = products.find((x) => x.id === productId);
  return p?.costStd && p.costStd > 0 ? p.costStd : 0;
}

export type LiveLine = {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  qty: number;
  unitCost: number;
  lineCost: number;
  pct: number;
  isComposite: boolean;
};

export type LivePreview = {
  lines: LiveLine[];
  materialCost: number;
  laborCost: number;
  finalCost: number;
  points: ChartPoint[];
};

export function buildLivePreview(
  recipeLines: Array<{ productId: string; qty: string | number }>,
  laborMinutes: number,
  difficultyLevel: number,
  difficultyFactor: number | undefined,
  laborBaseRate: number,
  products: Product[],
  sheets: CostSheet[],
  productIdsWithSheet: Set<string>,
): LivePreview {
  const factor =
    difficultyFactor && difficultyFactor > 0
      ? difficultyFactor
      : defaultDifficultyFactor(difficultyLevel || 1);
  const lines: LiveLine[] = [];
  let material = 0;
  for (const raw of recipeLines) {
    if (!raw.productId) continue;
    const qty = typeof raw.qty === 'number' ? raw.qty : parseFloat(String(raw.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const p = products.find((x) => x.id === raw.productId);
    const unitCost = productUnitCost(raw.productId, products, sheets);
    const lineCost = unitCost * qty;
    material += lineCost;
    lines.push({
      productId: raw.productId,
      productCode: p?.code || '',
      productName: p?.name || '',
      unit: p?.unit || '',
      qty,
      unitCost,
      lineCost,
      pct: 0,
      isComposite: productIdsWithSheet.has(raw.productId),
    });
  }
  const labor = Math.max(0, laborBaseRate) * Math.max(0, laborMinutes) * factor;
  const final = material + labor;
  for (const l of lines) {
    l.pct = final > 0 ? (l.lineCost / final) * 100 : 0;
  }
  const points: ChartPoint[] = lines.map((l, i) => ({
    label: l.productCode || l.productName || 'Comp.',
    value: l.lineCost,
    hint: `${l.qty}${l.unit ? ' ' + l.unit : ''} · ${l.isComposite ? 'compuesto' : 'base'}`,
    color: paletteColor(i),
  }));
  if (labor > 0) {
    points.push({
      label: 'Elaboración',
      value: labor,
      hint: `${laborMinutes} min × factor ${factor.toFixed(2)}`,
      color: paletteColor(points.length),
    });
  }
  return { lines, materialCost: material, laborCost: labor, finalCost: final, points };
}

/** Donut de una ficha guardada (componentes + elaboración). */
export function sheetCompositionPoints(sheet: CostSheet): ChartPoint[] {
  const points: ChartPoint[] = (sheet.components || []).map((c, i) => ({
    label: c.productCode || c.productName || 'Comp.',
    value: c.lineCost > 0 ? c.lineCost : Math.max(0, c.qty * c.unitCost),
    hint: `qty ${c.qty}`,
    color: paletteColor(i),
  }));
  const labor = sheet.laborCost || sheet.salarioDirecto || 0;
  if (labor > 0) {
    points.push({
      label: 'Elaboración',
      value: labor,
      color: paletteColor(points.length),
    });
  }
  // Fallback if only costoUnitario
  if (points.length === 0 && sheet.costoUnitario > 0) {
    points.push({
      label: 'Costo unitario',
      value: sheet.costoUnitario,
      color: paletteColor(0),
    });
  }
  // Agrupar "Otros" si hay muchos
  if (points.length > 6) {
    const main = points.slice(0, 5);
    const rest = points.slice(5).reduce((s, p) => s + p.value, 0);
    main.push({ label: 'Otros', value: rest, color: paletteColor(5) });
    return main;
  }
  return points;
}

export function relativeTime(iso: string, now = Date.now()): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const d = Math.max(0, now - t);
  const mins = Math.floor(d / 60000);
  if (mins < 60) return mins <= 1 ? 'Hace un momento' : `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return hours === 1 ? 'Hace 1 h' : `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hace 1 día';
  return `Hace ${days} días`;
}
