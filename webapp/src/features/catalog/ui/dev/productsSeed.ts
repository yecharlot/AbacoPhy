import type { CreateProductInput } from '../../domain/entities/Product';
import type { CatalogStore } from '../stores/catalogStore';

export type SeedProduct = {
  name: string;
  unit?: string;
  category?: string;
  price_sale?: number;
  cost_std?: number;
  code?: string;
};

export type SeedProductsPayload = {
  products: SeedProduct[];
};

export function buildSampleProductsPayload(): SeedProductsPayload {
  return {
    products: [
      { name: 'Café molido 250g', unit: 'ud', category: 'Alimentos', price_sale: 450, cost_std: 280 },
      { name: 'Azúcar refinada 1kg', unit: 'ud', category: 'Alimentos', price_sale: 180, cost_std: 110 },
      { name: 'Aceite vegetal 1L', unit: 'ud', category: 'Alimentos', price_sale: 520, cost_std: 340 },
      { name: 'Jabón de tocador', unit: 'ud', category: 'Higiene', price_sale: 95, cost_std: 55 },
      { name: 'Detergente 500g', unit: 'ud', category: 'Higiene', price_sale: 210, cost_std: 130 },
      { name: 'Servicio de entrega', unit: 'ud', category: 'Servicios', price_sale: 150, cost_std: 0 },
      { name: 'Bolsa reutilizable', unit: 'ud', category: 'Empaque', price_sale: 40, cost_std: 15 },
      { name: 'Agua 1.5L', unit: 'ud', category: 'Bebidas', price_sale: 60, cost_std: 25 },
    ],
  };
}

export async function seedProductsViaStore(
  store: CatalogStore,
  payload: unknown,
): Promise<{ ok: number; fail: number; message?: string }> {
  const data = payload as SeedProductsPayload;
  if (!data || !Array.isArray(data.products)) {
    throw new Error('Se espera { "products": [ { name, unit?, category?, price_sale?, cost_std? } ] }');
  }

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  for (const p of data.products) {
    if (!p.name?.trim()) {
      fail++;
      continue;
    }
    const input: CreateProductInput = {
      name: p.name.trim(),
      unit: p.unit ?? 'ud',
      category: p.category,
      costStd: p.cost_std,
      priceSale: p.price_sale,
      code: p.code,
    };
    try {
      await store.addProduct(input);
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
    message: `Productos: ${ok} creados, ${fail} fallidos${
      errors.length ? ` · ${errors.slice(0, 3).join('; ')}` : ''
    }`,
  };
}
