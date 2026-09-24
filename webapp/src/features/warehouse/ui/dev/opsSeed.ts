/**
 * Seed DEV: recepciones y transferencias (API real).
 * Requiere productos en catálogo (seed de productos primero).
 */
import type { WarehouseStore } from '../stores/warehouseStore';
import type { CreateReceptionInput } from '../../domain/entities/Reception';
import type { CreateTransferInput } from '../../domain/entities/Transfer';

export type SeedReception = {
  supplier: string;
  docRef?: string;
  date: string;
  note?: string;
  /** Índices sobre products[] del store tras loadAll */
  lines: Array<{ productIndex: number; qty: number; unitCost: number }>;
};

export type SeedTransfer = {
  date: string;
  note?: string;
  lines: Array<{ productIndex: number; qty: number }>;
};

export type WarehouseOpsSeedPayload = {
  ensureUnit?: { name: string; address?: string; phone?: string };
  receptions: SeedReception[];
  transfers: SeedTransfer[];
};

function dayOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** ≥20 recepciones + ≥20 transferencias, fechas repartidas ~40 días. */
export function buildSampleWarehouseOpsPayload(): WarehouseOpsSeedPayload {
  const suppliers = [
    'Alimentos del Caribe',
    'Distribuidora Habana',
    'Importadora Oriente',
    'Cooperativa Villa',
    'Proveedor Local SA',
  ];
  const receptions: SeedReception[] = [];
  const transfers: SeedTransfer[] = [];

  for (let i = 0; i < 20; i++) {
    const date = dayOffset(40 - i * 2);
    const pi = i % 8;
    receptions.push({
      supplier: suppliers[i % suppliers.length],
      docRef: `FAC-R-${1000 + i}`,
      date,
      note: `Recepción programada ${date}`,
      lines: [
        { productIndex: pi, qty: 20 + (i % 5) * 4, unitCost: 80 + (i % 7) * 15 },
        { productIndex: (pi + 1) % 8, qty: 10 + (i % 3) * 2, unitCost: 50 + (i % 4) * 10 },
      ],
    });
    transfers.push({
      date: dayOffset(39 - i * 2),
      note: `Traslado a unidad ${date}`,
      lines: [
        { productIndex: pi, qty: 5 + (i % 4) },
        { productIndex: (pi + 2) % 8, qty: 3 + (i % 3) },
      ],
    });
  }

  return {
    ensureUnit: {
      name: 'Mostrador Centro',
      address: 'Calle 23 #456, Plaza',
      phone: '78301234',
    },
    receptions,
    transfers,
  };
}

function pickProductId(
  products: Array<{ id: string }>,
  index: number,
): string | null {
  if (!products.length) return null;
  return products[index % products.length]?.id ?? null;
}

export async function seedWarehouseOpsViaStore(
  store: WarehouseStore,
  payload: unknown,
): Promise<{ ok: number; fail: number; message?: string }> {
  const data = payload as WarehouseOpsSeedPayload;
  if (!data?.receptions || !data?.transfers) {
    throw new Error('Se espera { ensureUnit?, receptions: [], transfers: [] }');
  }

  await store.loadAll();
  let products = store.getState().products;
  if (!products.length) {
    throw new Error(
      'No hay productos. Carga primero el seed de Catálogo (productos).',
    );
  }

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  // Unidad de venta
  let unitId = store.getState().units[0]?.id;
  if (!unitId && data.ensureUnit?.name) {
    try {
      await store.addSalesUnit({
        name: data.ensureUnit.name,
        address: data.ensureUnit.address,
        phone: data.ensureUnit.phone,
      });
      await store.loadAll();
      unitId = store.getState().units[0]?.id;
      ok++;
    } catch (e) {
      fail++;
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  products = store.getState().products;

  for (const r of data.receptions) {
    const lines = r.lines
      .map((l) => {
        const productId = pickProductId(products, l.productIndex);
        if (!productId) return null;
        return { productId, qty: l.qty, unitCost: l.unitCost };
      })
      .filter(Boolean) as CreateReceptionInput['lines'];

    if (!lines.length) {
      fail++;
      errors.push('Recepción sin líneas válidas');
      continue;
    }
    const input: CreateReceptionInput = {
      supplier: r.supplier,
      docRef: r.docRef,
      date: r.date,
      note: r.note,
      lines,
    };
    try {
      await store.addReception(input);
      ok++;
    } catch (e) {
      fail++;
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  unitId = store.getState().units[0]?.id;
  if (!unitId) {
    errors.push('Sin unidad de venta: transferencias omitidas');
  } else {
    for (const t of data.transfers) {
      const lines = t.lines
        .map((l) => {
          const productId = pickProductId(products, l.productIndex);
          if (!productId) return null;
          return { productId, qty: l.qty };
        })
        .filter(Boolean) as CreateTransferInput['lines'];

      if (!lines.length) {
        fail++;
        continue;
      }
      const input: CreateTransferInput = {
        unitId,
        date: t.date,
        note: t.note,
        lines,
      };
      try {
        await store.addTransfer(input);
        ok++;
      } catch (e) {
        fail++;
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  await store.loadAll().catch(() => undefined);

  return {
    ok,
    fail,
    message: `Almacén ops: ${ok} ok, ${fail} fallos${
      errors.length ? ` · ${errors.slice(0, 3).join('; ')}` : ''
    }`,
  };
}
