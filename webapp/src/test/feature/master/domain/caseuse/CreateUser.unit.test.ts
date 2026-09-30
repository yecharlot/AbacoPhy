import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import { CreateUser } from '../../../../../features/master/domain/usecases';
import type { MasterRepository } from '../../../../../features/master/domain/repositories/MasterRepository';

describe('CreateUser', () => {
  it('delega en el repositorio', async () => {
    const repo = mockOf<MasterRepository>({
      createUser: vi.fn().mockResolvedValue([]),
    });
    // role debe ser AssignableRole (CreateUser valida isAssignableRole)
    await expect(
      new CreateUser(repo).execute({
        username: 'usernameTest',
        displayName: 'displayNameTest',
        password: 'password',
        role: 'vendedor',
      }),
    ).resolves.toEqual([]);
    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'usernameTest',
        role: 'vendedor',
      }),
    );
  });

  it('rechaza roles no asignables', async () => {
    const repo = mockOf<MasterRepository>({
      createUser: vi.fn().mockResolvedValue([]),
    });
    await expect(
      new CreateUser(repo).execute({
        username: 'usernameTest',
        displayName: 'displayNameTest',
        password: 'password',
        role: 'roleTest',
      }),
    ).rejects.toThrow(/Rol no permitido/);
    expect(repo.createUser).not.toHaveBeenCalled();
  });
});
