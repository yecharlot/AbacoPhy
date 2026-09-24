import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { MasterRepository } from '../../../../../features/master/domain/repositories/MasterRepository';
import type { PlatformUser } from '../../../../../features/master/domain/entities/PlatformUser';
import { UpdateUser } from '../../../../../features/master/domain/usecases';

const user: PlatformUser = {
  id: 'idtest',
  username: 'u1',
  displayName: 'nameTest',
  role: 'admin',
  active: true,
  modules: {},
};

describe('UpdateUser', () => {
  it('delega en el repositorio', async () => {
    const repo = mockOf<MasterRepository>({
      updateUser: vi.fn().mockResolvedValue(user),
    });
    const input = {
      id: 'idtest',
      displayName: 'nameTest',
      role: 'admin',
      password: 'passTest',
      active: true,
      modules: {},
    };
    await expect(new UpdateUser(repo).execute(input)).resolves.toEqual(user);
    expect(repo.updateUser).toHaveBeenCalledWith(input);
  });

  it('rechaza id vacío', async () => {
    const repo = mockOf<MasterRepository>({ updateUser: vi.fn() });
    await expect(new UpdateUser(repo).execute({ id: '' })).rejects.toThrow('Usuario no válido');
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('rechaza password corta', async () => {
    const repo = mockOf<MasterRepository>({ updateUser: vi.fn() });
    await expect(
      new UpdateUser(repo).execute({ id: 'idtest', password: '123' }),
    ).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
  });
});
