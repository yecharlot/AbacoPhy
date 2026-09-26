/** Umbral de stock bajo (unidades). Configurable en un solo sitio. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = 'out' | 'low' | 'ok';

export type StockLevelMeta = {
  level: StockLevel;
  label: string;
  /** Clase CSS semántica */
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
  if (level === 'low') return { level, label: 'Bajo stock', tone: 'warn' };
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

/** Orden: agotado → bajo → ok; dentro de cada grupo, menor qty primero, luego nombre. */
export function sortStockBoard(rows: StockBoardRow[]): StockBoardRow[] {
  const rank = { out: 0, low: 1, ok: 2 } as const;
  return [...rows].sort((a, b) => {
    const ra = rank[a.meta.level];
    const rb = rank[b.meta.level];
    if (ra !== rb) return ra - rb;
    if (a.qty !== b.qty) return a.qty - b.qty;
    return a.name.localeCompare(b.name, 'es');
  });
}
