import type { Product } from '../../../catalog/domain/entities/Product';
import type { CostSheet } from '../../../costing/domain/entities/CostSheet';
import type { PriceSheet } from '../../../costing/domain/entities/PriceSheet';
import {
  getReceptionVisualStatus,
  type Reception,
} from '../../../warehouse/domain/entities/Reception';
import type { UnitStockRow, WarehouseStockRow } from '../../../warehouse/domain/entities/Stock';
import { LOW_STOCK_THRESHOLD } from '../../../pos/domain/stockStatus';

export type ReviewSeverity = 'critical' | 'warn' | 'info';

export type ReviewItem = {
  id: string;
  severity: ReviewSeverity;
  category: 'stock' | 'price' | 'reception';
  title: string;
  detail: string;
  /** screen id for App navigation */
  actionScreen?: string;
  actionLabel?: string;
};

export type ReviewTodaySummary = {
  items: ReviewItem[];
  stockLow: number;
  stockOut: number;
  pricesStale: number;
  receptionsPending: number;
  receptionsProblem: number;
  total: number;
};

function liveCost(
  productId: string,
  products: Product[],
  costSheets: CostSheet[],
): number {
  const sheet = costSheets.find((c) => c.productId === productId);
  if (sheet && sheet.costoUnitario > 0) return sheet.costoUnitario;
  const p = products.find((x) => x.id === productId);
  return p?.costStd && p.costStd > 0 ? p.costStd : 0;
}

function suggestedPrice(cost: number, markupPct: number): number {
  if (cost <= 0) return 0;
  return cost * (1 + Math.max(0, markupPct) / 100);
}

/**
 * Agrega alertas operativas del día para el Dashboard.
 * No depende de Svelte ni de stores concretos.
 */
export function buildReviewToday(input: {
  unitStocks?: UnitStockRow[];
  warehouseRows?: WarehouseStockRow[];
  products?: Product[];
  receptions?: Reception[];
  priceSheets?: PriceSheet[];
  costSheets?: CostSheet[];
  unitNames?: Map<string, string>;
  lowThreshold?: number;
}): ReviewTodaySummary {
  const threshold = input.lowThreshold ?? LOW_STOCK_THRESHOLD;
  const products = input.products ?? [];
  const costSheets = input.costSheets ?? [];
  const priceSheets = input.priceSheets ?? [];
  const unitStocks = input.unitStocks ?? [];
  const receptions = input.receptions ?? [];
  const unitNames = input.unitNames ?? new Map<string, string>();

  const items: ReviewItem[] = [];
  let stockOut = 0;
  let stockLow = 0;

  for (const s of unitStocks) {
    const qty = s.qty ?? 0;
    const prod = products.find((p) => p.id === s.productId);
    const name = prod?.name || s.productId;
    const code = prod?.code || '';
    const unitLabel = unitNames.get(s.unitId) || s.unitId || 'PDV';
    if (qty <= 0) {
      stockOut++;
      items.push({
        id: `stock-out-${s.unitId}-${s.productId}`,
        severity: 'critical',
        category: 'stock',
        title: `Agotado · ${code || name}`,
        detail: `${name} en ${unitLabel} (0 uds)`,
        actionScreen: 'pos',
        actionLabel: 'Ver POS',
      });
    } else if (qty <= threshold) {
      stockLow++;
      items.push({
        id: `stock-low-${s.unitId}-${s.productId}`,
        severity: 'warn',
        category: 'stock',
        title: `Stock bajo · ${code || name}`,
        detail: `${name} en ${unitLabel}: ${qty} uds (umbral ≤ ${threshold})`,
        actionScreen: 'almacen',
        actionLabel: 'Almacén',
      });
    }
  }


  for (const s of input.warehouseRows ?? []) {
    const qty = s.qty ?? 0;
    const name = s.name || s.productId;
    const code = s.code || '';
    if (qty <= 0) {
      stockOut++;
      items.push({
        id: `wh-out-${s.productId}`,
        severity: 'critical',
        category: 'stock',
        title: `Almacén agotado · ${code || name}`,
        detail: `${name} en almacén central (0 uds)`,
        actionScreen: 'almacen',
        actionLabel: 'Almacén',
      });
    } else if (qty <= threshold) {
      stockLow++;
      items.push({
        id: `wh-low-${s.productId}`,
        severity: 'warn',
        category: 'stock',
        title: `Almacén bajo · ${code || name}`,
        detail: `${name} en almacén: ${qty} uds (umbral ≤ ${threshold})`,
        actionScreen: 'almacen',
        actionLabel: 'Almacén',
      });
    }
  }

  let pricesStale = 0;
  for (const ps of priceSheets) {
    const cost = liveCost(ps.productId, products, costSheets);
    if (cost <= 0) continue;
    const ref = ps.costRef || 0;
    const costDrift = ref > 0 ? Math.abs(cost - ref) / ref : cost > 0 ? 1 : 0;
    const sug = suggestedPrice(cost, ps.marginPct || 0);
    const prod = products.find((p) => p.id === ps.productId);
    const vigente = prod?.priceSale && prod.priceSale > 0 ? prod.priceSale : ps.price;
    const belowSuggested = sug > 0 && vigente > 0 && vigente + 0.01 < sug;
    const costChanged = costDrift >= 0.02; // ≥ 2 %
    if (belowSuggested || costChanged) {
      pricesStale++;
      const parts: string[] = [];
      if (costChanged) {
        parts.push(
          `costo ${ref > 0 ? ref.toFixed(2) : '—'} → ${cost.toFixed(2)}`,
        );
      }
      if (belowSuggested) {
        parts.push(`vigente ${vigente.toFixed(2)} < sugerido ${sug.toFixed(2)}`);
      }
      items.push({
        id: `price-${ps.id || ps.productId}`,
        severity: belowSuggested ? 'critical' : 'warn',
        category: 'price',
        title: `Precio a revisar · ${ps.productCode || prod?.code || ps.productName}`,
        detail: parts.join(' · ') || 'Actualizar ficha de precio',
        actionScreen: 'fichas-precio',
        actionLabel: 'Fichas de precio',
      });
    }
  }

  // Productos con priceSale y sin ficha pero con costo — info suave
  const withPriceSheet = new Set(priceSheets.map((p) => p.productId));
  for (const p of products) {
    if (withPriceSheet.has(p.id)) continue;
    const cost = liveCost(p.id, products, costSheets);
    if (cost > 0 && (!p.priceSale || p.priceSale <= 0)) {
      pricesStale++;
      items.push({
        id: `price-missing-${p.id}`,
        severity: 'info',
        category: 'price',
        title: `Sin precio de venta · ${p.code || p.name}`,
        detail: `Tiene costo (${cost.toFixed(2)}) pero no ficha de precio / PriceSale`,
        actionScreen: 'fichas-precio',
        actionLabel: 'Crear ficha',
      });
    }
  }

  let receptionsPending = 0;
  let receptionsProblem = 0;
  for (const r of receptions) {
    const st = getReceptionVisualStatus(r);
    if (st === 'pending_entry') {
      receptionsPending++;
      items.push({
        id: `rec-pending-${r.id}`,
        severity: 'warn',
        category: 'reception',
        title: `Recepción pendiente · ${r.number || r.id}`,
        detail: `${r.supplier || 'Proveedor'} · ${r.date?.slice(0, 10) || '—'} · entrar en almacén`,
        actionScreen: 'almacen',
        actionLabel: 'Dar entrada',
      });
    } else if (st === 'entry_problem') {
      receptionsProblem++;
      items.push({
        id: `rec-problem-${r.id}`,
        severity: 'critical',
        category: 'reception',
        title: `Recepción con problemas · ${r.number || r.id}`,
        detail: r.note || r.supplier || 'Revisar en almacén / informes de recepción',
        actionScreen: 'recepcion',
        actionLabel: 'Ver recepción',
      });
    }
  }

  // Prioridad: critical > warn > info; limitar ruido
  const weight = (s: ReviewSeverity) => (s === 'critical' ? 0 : s === 'warn' ? 1 : 2);
  items.sort((a, b) => weight(a.severity) - weight(b.severity) || a.title.localeCompare(b.title));

  return {
    items: items.slice(0, 40),
    stockLow,
    stockOut,
    pricesStale,
    receptionsPending,
    receptionsProblem,
    total: items.length,
  };
}
