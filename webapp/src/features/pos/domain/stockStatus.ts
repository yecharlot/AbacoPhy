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

/** Dentro de cada bloque: menor cantidad primero. */
export function sortByQtyAsc(rows: StockBoardRow[]): StockBoardRow[] {
  return [...rows].sort((a, b) => {
    if (a.qty !== b.qty) return a.qty - b.qty;
    return a.name.localeCompare(b.name, 'es');
  });
}
