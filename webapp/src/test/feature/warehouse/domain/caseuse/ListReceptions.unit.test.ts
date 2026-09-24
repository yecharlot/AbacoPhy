import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { WarehouseRepository } from '../../../../../features/warehouse/domain/repositories/WarehouseRepository';
import { ListReceptions } from '../../../../../features/warehouse/domain/usecases';

describe('ListReceptions', () => {
  it('delega en getReceptions', async () => {
    const repo = mockOf<WarehouseRepository>({
      getReceptions: vi.fn().mockResolvedValue([]),
    });
    await expect(new ListReceptions(repo).execute()).resolves.toEqual([]);
    expect(repo.getReceptions).toHaveBeenCalledOnce();
  });
});
