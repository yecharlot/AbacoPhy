import type { CostingStore } from '../stores/costingStore';
import type { SaveCostSheetInput } from '../../domain/entities/CostSheet';
import type { SavePriceSheetInput } from '../../domain/entities/PriceSheet';

export type SeedCostSheet = {
  productIndex: number;
  period: string;
  materiaPrima: number;
  materialesAuxiliares: number;
  energia: number;
  salarioDirecto: number;
  otrosDirectos: number;
  gastosIndirectos: number;
  notes?: string;
};

export type SeedPriceSheet = {
  productIndex: number;
  costRef: number;
  marginPct: number;
  price?: number;
  notes?: string;
};

export type SheetsSeedPayload = {
  costSheets: SeedCostSheet[];
  priceSheets: SeedPriceSheet[];
};

function monthOffset(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function buildSampleSheetsPayload(): SheetsSeedPayload {
  const costSheets: SeedCostSheet[] = [];
  const priceSheets: SeedPriceSheet[] = [];

  for (let i = 0; i < 20; i++) {
    const productIndex = i % 8;
    const period = monthOffset(i % 12);
    const mp = 100 + i * 12;
    const aux = 20 + (i % 5) * 4;
    const en = 15 + (i % 4) * 3;
    const sal = 40 + (i % 6) * 5;
    const otros = 10 + (i % 3) * 2;
    const ind = 25 + (i % 4) * 6;
    const unitApprox = mp + aux + en + sal + otros + ind;

    costSheets.push({
      productIndex,
      period,
      materiaPrima: mp,
      materialesAuxiliares: aux,
      energia: en,
      salarioDirecto: sal,
      otrosDirectos: otros,
      gastosIndirectos: ind,
      notes: `Ficha costo ${period} #${i + 1}`,
    });

    priceSheets.push({
      productIndex,
      costRef: Math.round(unitApprox * 100) / 100,
      marginPct: 25 + (i % 5) * 5,
      price: Math.round(unitApprox * (1.25 + (i % 5) * 0.05) * 100) / 100,
      notes: `Lista precio #${i + 1}`,
    });
  }

  return { costSheets, priceSheets };
}

export async function seedSheetsViaStore(
  store: CostingStore,
  payload: unknown,
): Promise<{ ok: number; fail: number; message?: string }> {
  const data = payload as SheetsSeedPayload;
  if (!data?.costSheets || !data?.priceSheets) {
    throw new Error('Se espera { costSheets: [], priceSheets: [] }');
  }

  await store.loadAll();
  const products = store.getState().products;
  if (!products.length) {
    throw new Error('No hay productos. Seed de Catálogo primero.');
  }

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  for (const c of data.costSheets) {
    const product = products[c.productIndex % products.length];
    if (!product) {
      fail++;
      continue;
    }
    const input: SaveCostSheetInput = {
      productId: product.id,
      period: c.period,
      materiaPrima: c.materiaPrima,
      materialesAuxiliares: c.materialesAuxiliares,
      energia: c.energia,
      salarioDirecto: c.salarioDirecto,
      otrosDirectos: c.otrosDirectos,
      gastosIndirectos: c.gastosIndirectos,
      currency: 'CUP',
      notes: c.notes,
    };
    try {
      await store.saveCostSheet(input);
      ok++;
    } catch (e) {
      fail++;
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  for (const p of data.priceSheets) {
    const product = products[p.productIndex % products.length];
    if (!product) {
      fail++;
      continue;
    }
    const input: SavePriceSheetInput = {
      productId: product.id,
      costRef: p.costRef,
      marginPct: p.marginPct,
      price: p.price,
      currency: 'CUP',
      notes: p.notes,
    };
    try {
      await store.savePriceSheet(input);
      ok++;
    } catch (e) {
      fail++;
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  await store.loadAll().catch(() => undefined);

  return {
    ok,
    fail,
    message: `Fichas: ${ok} ok, ${fail} fallos${
      errors.length ? ` · ${errors.slice(0, 3).join('; ')}` : ''
    }`,
  };
}
