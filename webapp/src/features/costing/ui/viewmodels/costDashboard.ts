import type { Product } from '../../../catalog/domain/entities/Product';
import type { CostSheet } from '../../domain/entities/CostSheet';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type CostVariationRow = {
  productId: string;
  productCode: string;
  productName: string;
  previous: number;
  current: number;
  absDelta: number;
  pctDelta: number;
  direction: 'up' | 'down' | 'flat';
  updatedAt: string;
  /** true si hay costo previo → típico de recálculo/propagación */
  inherited: boolean;
};

export type CostDashboardStats = {
  sheetsCount: number;
  withoutSheetCount: number;
  risingCount: number;
  fallingCount: number;
  recentModifiedCount: number;
  impactAbs: number;
  variations: CostVariationRow[];
};

function parseUpdatedAt(iso: string): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function buildCostDashboard(
  sheets: CostSheet[],
  products: Product[],
  now = Date.now(),
): CostDashboardStats {
  const withSheet = new Set(sheets.map((s) => s.productId));
  const withoutSheetCount = products.filter((p) => !withSheet.has(p.id)).length;
  const weekAgo = now - WEEK_MS;
  const variations: CostVariationRow[] = [];

  for (const s of sheets) {
    const prev = s.previousCostoUnitario || 0;
    const cur = s.costoUnitario || 0;
    if (prev <= 0 || cur === prev) continue;
    const absDelta = cur - prev;
    const pctDelta = prev > 0 ? (absDelta / prev) * 100 : 0;
    const updated = parseUpdatedAt(s.updatedAt);
    if (updated > 0 && updated < weekAgo) continue;
    variations.push({
      productId: s.productId,
      productCode: s.productCode,
      productName: s.productName,
      previous: prev,
      current: cur,
      absDelta,
      pctDelta,
      direction: absDelta > 0 ? 'up' : absDelta < 0 ? 'down' : 'flat',
      updatedAt: s.updatedAt,
      inherited: true,
    });
  }

  variations.sort((a, b) => Math.abs(b.absDelta) - Math.abs(a.absDelta));

  return {
    sheetsCount: sheets.length,
    withoutSheetCount,
    risingCount: variations.filter((v) => v.direction === 'up').length,
    fallingCount: variations.filter((v) => v.direction === 'down').length,
    recentModifiedCount: sheets.filter((s) => parseUpdatedAt(s.updatedAt) >= weekAgo).length,
    impactAbs: variations.reduce((acc, v) => acc + v.absDelta, 0),
    variations,
  };
}

export type SheetFilter = 'all' | 'recent' | 'up' | 'down';
export type SheetSort =
  | 'recent'
  | 'oldest'
  | 'cost_desc'
  | 'cost_asc'
  | 'var_desc'
  | 'var_asc';

export function filterAndSortSheets(
  sheets: CostSheet[],
  query: string,
  filter: SheetFilter,
  sort: SheetSort,
  now = Date.now(),
): CostSheet[] {
  const q = query.trim().toLowerCase();
  const weekAgo = now - WEEK_MS;
  let list = sheets.filter((s) => {
    if (q) {
      const hay = `${s.productCode} ${s.productName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const prev = s.previousCostoUnitario || 0;
    const cur = s.costoUnitario || 0;
    const delta = prev > 0 ? cur - prev : 0;
    const updated = parseUpdatedAt(s.updatedAt);
    if (filter === 'recent' && updated < weekAgo) return false;
    if (filter === 'up' && !(prev > 0 && delta > 0)) return false;
    if (filter === 'down' && !(prev > 0 && delta < 0)) return false;
    return true;
  });

  list = [...list].sort((a, b) => {
    const ua = parseUpdatedAt(a.updatedAt);
    const ub = parseUpdatedAt(b.updatedAt);
    const da = (a.previousCostoUnitario || 0) > 0 ? a.costoUnitario - a.previousCostoUnitario : 0;
    const db = (b.previousCostoUnitario || 0) > 0 ? b.costoUnitario - b.previousCostoUnitario : 0;
    switch (sort) {
      case 'oldest':
        return ua - ub;
      case 'cost_desc':
        return b.costoUnitario - a.costoUnitario;
      case 'cost_asc':
        return a.costoUnitario - b.costoUnitario;
      case 'var_desc':
        return Math.abs(db) - Math.abs(da);
      case 'var_asc':
        return Math.abs(da) - Math.abs(db);
      case 'recent':
      default:
        return ub - ua;
    }
  });
  return list;
}
