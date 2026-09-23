import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { CostingRepository } from '../../../../../features/costing/domain/repositories/CostingRepository';
import type { PriceSheet } from '../../../../../features/costing/domain/entities/PriceSheet';
import { SavePriceSheet } from '../../../../../features/costing/domain/usecases';

const sheet: PriceSheet = {
  id: 'ps1',
  productId: 'p1',
  productCode: 'SKU',
  productName: 'Prod',
  price: 100,
  costRef: 50,
  marginPct: 100,
  currency: 'CUP',
  notes: '',
};

describe('SavePriceSheet', () => {
  it('delega con precio válido', async () => {
    const repo = mockOf<CostingRepository>({
      savePriceSheet: vi.fn().mockResolvedValue(sheet),
    });
    const input = { productId: 'p1', price: 100 };
    await expect(new SavePriceSheet(repo).execute(input)).resolves.toEqual(sheet);
    expect(repo.savePriceSheet).toHaveBeenCalledWith(input);
  });

  it('rechaza sin producto', async () => {
    const repo = mockOf<CostingRepository>({ savePriceSheet: vi.fn() });
    await expect(new SavePriceSheet(repo).execute({ productId: '', price: 10 })).rejects.toThrow(
      'Seleccione el producto de la ficha',
    );
  });

  it('rechaza sin precio ni costRef', async () => {
    const repo = mockOf<CostingRepository>({ savePriceSheet: vi.fn() });
    await expect(new SavePriceSheet(repo).execute({ productId: 'p1' })).rejects.toThrow(
      'Indique el precio o un costo de referencia con margen',
    );
  });
});
