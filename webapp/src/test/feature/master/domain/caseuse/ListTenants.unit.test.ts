import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { MasterRepository } from '../../../../../features/master/domain/repositories/MasterRepository';
import { ListTenants } from '../../../../../features/master/domain/usecases';

describe('ListTenants', () => {
  it('delega en el repositorio', async () => {
    const repo = mockOf<MasterRepository>({
      getTenants: vi.fn().mockResolvedValue([]),
    });
    await expect(new ListTenants(repo).execute()).resolves.toEqual([]);
    expect(repo.getTenants).toHaveBeenCalledOnce();
  });
});
