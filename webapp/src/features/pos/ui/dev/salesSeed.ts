import type { PosStore } from '../stores/posStore';
import type { CreateSaleInput } from '../../domain/entities/Sale';

export type SeedSale = {
  date: string;
  seller?: string;
  note?: string;
  lines: Array<{ productIndex: number; qty: number; unitPrice?: number; discountPct?: number }>;
};

export type PosSeedPayload = {
  sales: SeedSale[];
};

function dayOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** 20 ventas POS repartidas en el tiempo. */
export function buildSamplePosSalesPayload(): PosSeedPayload {
  const sellers = ['Ana', 'Luis', 'María', 'Pedro', 'Carmen'];
  const sales: SeedSale[] = [];
  for (let i = 0; i < 20; i++) {
    const date = dayOffset(30 - i);
    const pi = i % 8;
    sales.push({
      date,
      seller: sellers[i % sellers.length],
      note: `Venta POS ${date}`,
      lines: [
        {
          productIndex: pi,
          qty: 1 + (i % 4),
          unitPrice: 90 + (i % 6) * 25,
          discountPct: i % 5 === 0 ? 5 : 0,
        },
        {
          productIndex: (pi + 3) % 8,
          qty: 1 + (i % 2),
          unitPrice: 60 + (i % 5) * 20,
        },
      ],
    });
  }
  return { sales };
}

export async function seedPosSalesViaStore(
  store: PosStore,
  payload: unknown,
): Promise<{ ok: number; fail: number; message?: string }> {
  const data = payload as PosSeedPayload;
  if (!data?.sales || !Array.isArray(data.sales)) {
    throw new Error('Se espera { "sales": [ ... ] }');
  }

  await store.loadAll();
  const products = store.getState().products;
  const unitId = store.getState().units[0]?.id;

  if (!products.length) {
    throw new Error('No hay productos. Seed de Catálogo primero.');
  }
  if (!unitId) {
    throw new Error(
      'No hay unidad de venta. Ejecuta seed de Almacén (ensureUnit) o crea una unidad.',
    );
  }

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  for (const s of data.sales) {
    const lines = s.lines
      .map((l) => {
        const product = products[l.productIndex % products.length];
        if (!product) return null;
        return {
          productId: product.id,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
        };
      })
      .filter(Boolean) as CreateSaleInput['lines'];

    if (!lines.length) {
      fail++;
      continue;
    }

    const input: CreateSaleInput = {
      unitId,
      seller: s.seller,
      date: s.date,
      note: s.note,
      lines,
    };
    try {
      await store.registerSale(input);
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
    message: `POS: ${ok} ventas, ${fail} fallos${
      errors.length ? ` · ${errors.slice(0, 3).join('; ')}` : ''
    }`,
  };
}
