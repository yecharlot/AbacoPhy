import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { CostingRepository } from '../../../../../features/costing/domain/repositories/CostingRepository';
import { ListPriceSheets } from '../../../../../features/costing/domain/usecases';

describe('ListPriceSheets', () => {
  it('delega en getPriceSheets', async () => {
    const repo = mockOf<CostingRepository>({
      getPriceSheets: vi.fn().mockResolvedValue([]),
    });
    await expect(new ListPriceSheets(repo).execute()).resolves.toEqual([]);
    expect(repo.getPriceSheets).toHaveBeenCalledOnce();
  });
});
