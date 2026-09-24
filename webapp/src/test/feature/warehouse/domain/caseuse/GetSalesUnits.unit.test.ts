import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { WarehouseRepository } from '../../../../../features/warehouse/domain/repositories/WarehouseRepository';
import { GetSalesUnits } from '../../../../../features/warehouse/domain/usecases';

describe('GetSalesUnits', () => {
  it('delega en getSalesUnits', async () => {
    const snapshot = { units: [], stocks: [] };
    const repo = mockOf<WarehouseRepository>({
      getSalesUnits: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(new GetSalesUnits(repo).execute()).resolves.toEqual(snapshot);
    expect(repo.getSalesUnits).toHaveBeenCalledOnce();
  });
});
