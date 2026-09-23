import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { MasterRepository } from '../../../../../features/master/domain/repositories/MasterRepository';
import { ListUsers } from '../../../../../features/master/domain/usecases';

describe('ListUsers', () => {
  it('delega en el repositorio', async () => {
    const snapshot = { users: [], roles: ['admin'] };
    const repo = mockOf<MasterRepository>({
      getUsers: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(new ListUsers(repo).execute()).resolves.toEqual(snapshot);
    expect(repo.getUsers).toHaveBeenCalledOnce();
  });
});
