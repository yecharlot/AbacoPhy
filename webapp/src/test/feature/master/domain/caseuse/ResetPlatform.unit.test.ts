import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { MasterRepository } from '../../../../../features/master/domain/repositories/MasterRepository';
import {
  RESET_CONFIRMATION,
  ResetPlatform,
} from '../../../../../features/master/domain/usecases/ResetPlatform';

describe('ResetPlatform', () => {
  it('rechaza palabra distinta a REINICIAR', async () => {
    const repo = mockOf<MasterRepository>({ resetPlatform: vi.fn() });
    await expect(new ResetPlatform(repo).execute('BORRAR')).rejects.toThrow(
      'Escriba REINICIAR para confirmar el reinicio',
    );
    expect(repo.resetPlatform).not.toHaveBeenCalled();
  });

  it('acepta con espacios y delega la palabra exacta', async () => {
    const repo = mockOf<MasterRepository>({
      resetPlatform: vi.fn().mockResolvedValue('ok'),
    });
    await expect(new ResetPlatform(repo).execute('  REINICIAR ')).resolves.toBe('ok');
    expect(repo.resetPlatform).toHaveBeenCalledWith(RESET_CONFIRMATION);
  });
});
