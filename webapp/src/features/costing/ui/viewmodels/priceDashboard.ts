import type { Product } from '../../../catalog/domain/entities/Product';
import type { CostSheet } from '../../domain/entities/CostSheet';
import type { PriceSheet } from '../../domain/entities/PriceSheet';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Costo vigente para pricing: ficha de costo (compuesto) o costStd (base). */
export function resolveLiveCost(
  productId: string,
  products: Product[],
  costSheets: CostSheet[],
): { cost: number; origin: 'sheet' | 'avg' | 'none'; isComposite: boolean } {
  const sheet = costSheets.find((s) => s.productId === productId);
  if (sheet && sheet.costoUnitario > 0) {
    return { cost: sheet.costoUnitario, origin: 'sheet', isComposite: true };
  }
  const p = products.find((x) => x.id === productId);
  if (p?.costStd && p.costStd > 0) {
    return { cost: p.costStd, origin: 'avg', isComposite: false };
  }
  return { cost: 0, origin: 'none', isComposite: false };
}

/** Markup sobre costo (API margin_pct). */
export function suggestedFromMarkup(cost: number, markupPct: number): number {
  if (cost <= 0) return 0;
  return cost * (1 + Math.max(0, markupPct) / 100);
}

export function priceStatus(
  suggested: number,
  vigente: number,
  cost: number,
): 'ok' | 'below_suggested' | 'above_suggested' | 'below_cost' | 'no_price' {
  if (vigente <= 0 && suggested <= 0) return 'no_price';
  if (cost > 0 && vigente > 0 && vigente < cost) return 'below_cost';
  if (suggested > 0 && vigente > 0) {
    const tol = Math.max(0.01, suggested * 0.005);
    if (vigente + tol < suggested) return 'below_suggested';
    if (vigente > suggested + tol) return 'above_suggested';
    return 'ok';
  }
  if (vigente <= 0 && suggested > 0) return 'no_price';
  return 'ok';
}

export function statusLabel(s: ReturnType<typeof priceStatus>): string {
  switch (s) {
    case 'below_cost':
      return 'Por debajo del costo';
    case 'below_suggested':
      return 'Por debajo del sugerido';
    case 'above_suggested':
      return 'Por encima del sugerido';
    case 'no_price':
      return 'Sin precio de venta';
    default:
      return 'Dentro del objetivo';
  }
}

export type PriceVariationRow = {
  productId: string;
  productCode: string;
  productName: string;
  costPrev: number;
  costCur: number;
  costPct: number;
  suggestedPrev: number;
  suggestedCur: number;
  vigente: number;
  markupPct: number;
  status: ReturnType<typeof priceStatus>;
  direction: 'up' | 'down' | 'flat';
};

export type PriceDashboardStats = {
  sheetsCount: number;
  withoutSheetCount: number;
  belowSuggestedCount: number;
  okCount: number;
  needsReviewCount: number;
  avgMarkup: number;
  variations: PriceVariationRow[];
};

export function buildPriceDashboard(
  sheets: PriceSheet[],
  products: Product[],
  costSheets: CostSheet[],
  now = Date.now(),
): PriceDashboardStats {
  const withSheet = new Set(sheets.map((s) => s.productId));
  const withoutSheetCount = products.filter((p) => !withSheet.has(p.id)).length;
  let below = 0;
  let ok = 0;
  let review = 0;
  let markupSum = 0;

  for (const s of sheets) {
    const live = resolveLiveCost(s.productId, products, costSheets);
    const cost = live.cost > 0 ? live.cost : s.costRef;
    const sug = suggestedFromMarkup(cost, s.marginPct);
    const prod = products.find((p) => p.id === s.productId);
    const vigente = prod?.priceSale && prod.priceSale > 0 ? prod.priceSale : s.price;
    const st = priceStatus(sug, vigente, cost);
    if (st === 'below_suggested' || st === 'below_cost') below++;
    if (st === 'ok') ok++;
    if (st === 'below_suggested' || st === 'below_cost' || st === 'no_price') review++;
    markupSum += s.marginPct || 0;
  }

  const variations: PriceVariationRow[] = [];
  const weekAgo = now - WEEK_MS;
  for (const cs of costSheets) {
    const prev = cs.previousCostoUnitario || 0;
    const cur = cs.costoUnitario || 0;
    if (prev <= 0 || cur === prev) continue;
    const updated = cs.updatedAt ? Date.parse(cs.updatedAt) : 0;
    if (Number.isFinite(updated) && updated > 0 && updated < weekAgo) continue;
    const ps = sheets.find((s) => s.productId === cs.productId);
    const markup = ps?.marginPct ?? 25;
    const sugPrev = suggestedFromMarkup(prev, markup);
    const sugCur = suggestedFromMarkup(cur, markup);
    const prod = products.find((p) => p.id === cs.productId);
    const vigente = prod?.priceSale && prod.priceSale > 0 ? prod.priceSale : ps?.price || 0;
    const abs = cur - prev;
    variations.push({
      productId: cs.productId,
      productCode: cs.productCode || prod?.code || '',
      productName: cs.productName || prod?.name || '',
      costPrev: prev,
      costCur: cur,
      costPct: prev > 0 ? (abs / prev) * 100 : 0,
      suggestedPrev: sugPrev,
      suggestedCur: sugCur,
      vigente,
      markupPct: markup,
      status: priceStatus(sugCur, vigente, cur),
      direction: abs > 0 ? 'up' : abs < 0 ? 'down' : 'flat',
    });
  }
  variations.sort((a, b) => Math.abs(b.costPct) - Math.abs(a.costPct));

  return {
    sheetsCount: sheets.length,
    withoutSheetCount,
    belowSuggestedCount: below,
    okCount: ok,
    needsReviewCount: review,
    avgMarkup: sheets.length ? markupSum / sheets.length : 0,
    variations,
  };
}

export type PriceFilter = 'all' | 'base' | 'composite' | 'below' | 'ok' | 'review';
export type PriceSort =
  | 'recent'
  | 'cost_desc'
  | 'cost_asc'
  | 'price_desc'
  | 'price_asc'
  | 'markup_desc';

export function filterAndSortPriceSheets(
  sheets: PriceSheet[],
  products: Product[],
  costSheets: CostSheet[],
  query: string,
  filter: PriceFilter,
  sort: PriceSort,
): PriceSheet[] {
  const q = query.trim().toLowerCase();
  let list = sheets.filter((s) => {
    if (q) {
      const hay = `${s.productCode} ${s.productName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const live = resolveLiveCost(s.productId, products, costSheets);
    const cost = live.cost > 0 ? live.cost : s.costRef;
    const sug = suggestedFromMarkup(cost, s.marginPct);
    const prod = products.find((p) => p.id === s.productId);
    const vigente = prod?.priceSale && prod.priceSale > 0 ? prod.priceSale : s.price;
    const st = priceStatus(sug, vigente, cost);
    if (filter === 'base' && live.isComposite) return false;
    if (filter === 'composite' && !live.isComposite) return false;
    if (filter === 'below' && st !== 'below_suggested' && st !== 'below_cost') return false;
    if (filter === 'ok' && st !== 'ok') return false;
    if (filter === 'review' && st !== 'below_suggested' && st !== 'below_cost' && st !== 'no_price')
      return false;
    return true;
  });

  list = [...list].sort((a, b) => {
    const la = resolveLiveCost(a.productId, products, costSheets);
    const lb = resolveLiveCost(b.productId, products, costSheets);
    const ca = la.cost || a.costRef;
    const cb = lb.cost || b.costRef;
    switch (sort) {
      case 'cost_asc':
        return ca - cb;
      case 'cost_desc':
        return cb - ca;
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'markup_desc':
        return (b.marginPct || 0) - (a.marginPct || 0);
      case 'recent':
      default: {
        const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      }
    }
  });
  return list;
}


export function relativeTime(iso: string, now = Date.now()): string {
  if (!iso) return '—';
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return '—';
  const d = Math.max(0, now - ts);
  const mins = Math.floor(d / 60000);
  if (mins < 60) return mins <= 1 ? 'Hace un momento' : `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return hours === 1 ? 'Hace 1 h' : `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hace 1 día';
  return `Hace ${days} días`;
}
