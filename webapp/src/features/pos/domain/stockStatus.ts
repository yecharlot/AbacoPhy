/** Umbral: qty > 0 y qty <= este valor = Casi agotado. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = 'out' | 'low' | 'ok';

export type StockLevelMeta = {
  level: StockLevel;
  label: string;
  tone: 'danger' | 'warn' | 'ok';
};

export function stockLevel(qty: number, lowThreshold = LOW_STOCK_THRESHOLD): StockLevel {
  if (!Number.isFinite(qty) || qty <= 0) return 'out';
  if (qty <= lowThreshold) return 'low';
  return 'ok';
}

export function stockLevelMeta(qty: number, lowThreshold = LOW_STOCK_THRESHOLD): StockLevelMeta {
  const level = stockLevel(qty, lowThreshold);
  if (level === 'out') return { level, label: 'Agotado', tone: 'danger' };
  if (level === 'low') return { level, label: 'Casi agotado', tone: 'warn' };
  return { level, label: 'Habilitado', tone: 'ok' };
}

export type StockBoardRow = {
  productId: string;
  code: string;
  name: string;
  qty: number;
  priceSale: number;
  unit?: string;
  meta: StockLevelMeta;
};

export function sortByQtyAsc(rows: StockBoardRow[]): StockBoardRow[] {
  return [...rows].sort((a, b) => {
    if (a.qty !== b.qty) return a.qty - b.qty;
    return a.name.localeCompare(b.name, 'es');
  });
}

export type ProductRef = {
  id: string;
  code?: string;
  name: string;
  priceSale?: number;
  unit?: string;
};

export type UnitStockRef = {
  unitId: string;
  productId: string;
  qty: number;
};

export function buildUnitStockBoard(
  unitId: string,
  products: ProductRef[],
  unitStocks: UnitStockRef[],
  lowThreshold = LOW_STOCK_THRESHOLD,
): { out: StockBoardRow[]; low: StockBoardRow[]; ok: StockBoardRow[] } {
  if (!unitId) return { out: [], low: [], ok: [] };
  const byProduct = new Map<string, number>();
  for (const s of unitStocks || []) {
    if (s.unitId !== unitId) continue;
    byProduct.set(s.productId, Number(s.qty) || 0);
  }
  const out: StockBoardRow[] = [];
  const low: StockBoardRow[] = [];
  const ok: StockBoardRow[] = [];
  for (const [productId, qty] of byProduct) {
    const p = products.find((x) => x.id === productId);
    const row: StockBoardRow = {
      productId,
      code: p?.code || '—',
      name: p?.name || productId,
      qty,
      priceSale: p?.priceSale ?? 0,
      unit: p?.unit,
      meta: stockLevelMeta(qty, lowThreshold),
    };
    if (row.meta.level === 'out') out.push(row);
    else if (row.meta.level === 'low') low.push(row);
    else ok.push(row);
  }
  return { out: sortByQtyAsc(out), low: sortByQtyAsc(low), ok: sortByQtyAsc(ok) };
}
