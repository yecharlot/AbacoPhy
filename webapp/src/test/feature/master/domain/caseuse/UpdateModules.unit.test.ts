import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { MasterRepository } from '../../../../../features/master/domain/repositories/MasterRepository';
import { UpdateModules } from '../../../../../features/master/domain/usecases';

describe('UpdateModules', () => {
  it('delega con al menos un módulo', async () => {
    const modules = { pos: true, almacen: false };
    const repo = mockOf<MasterRepository>({
      updateModules: vi.fn().mockResolvedValue(modules),
    });
    await expect(new UpdateModules(repo).execute(modules)).resolves.toEqual(modules);
    expect(repo.updateModules).toHaveBeenCalledWith(modules);
  });

  it('rechaza mapa vacío', async () => {
    const repo = mockOf<MasterRepository>({ updateModules: vi.fn() });
    await expect(new UpdateModules(repo).execute({})).rejects.toThrow(
      'No hay módulos que actualizar',
    );
    expect(repo.updateModules).not.toHaveBeenCalled();
  });
});
