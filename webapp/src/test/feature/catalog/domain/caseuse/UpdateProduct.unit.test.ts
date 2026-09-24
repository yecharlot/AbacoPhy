import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { CatalogRepository } from '../../../../../features/catalog/domain/repositories/CatalogRepository';
import type { Product } from '../../../../../features/catalog/domain/entities/Product';
import { UpdateProduct } from '../../../../../features/catalog/domain/usecases';

const product: Product = {
  id: 'p1',
  code: 'SKU-1',
  name: 'Producto',
  unit: 'u',
  category: 'cat',
  costStd: 10,
  priceSale: 20,
};

describe('UpdateProduct', () => {
  it('delega en updateProduct', async () => {
    const repo = mockOf<CatalogRepository>({
      updateProduct: vi.fn().mockResolvedValue(product),
    });
    const input = { id: 'p1', name: 'Producto', priceSale: 20 };
    await expect(new UpdateProduct(repo).execute(input)).resolves.toEqual(product);
    expect(repo.updateProduct).toHaveBeenCalledWith(input);
  });
});
