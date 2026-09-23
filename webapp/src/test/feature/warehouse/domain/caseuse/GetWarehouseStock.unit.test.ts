import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { WarehouseRepository } from '../../../../../features/warehouse/domain/repositories/WarehouseRepository';
import { GetWarehouseStock } from '../../../../../features/warehouse/domain/usecases';

describe('GetWarehouseStock', () => {
  it('delega en getStock', async () => {
    const snapshot = { rows: [], unitStocks: [] };
    const repo = mockOf<WarehouseRepository>({
      getStock: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(new GetWarehouseStock(repo).execute()).resolves.toEqual(snapshot);
    expect(repo.getStock).toHaveBeenCalledOnce();
  });
});
