import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { AuditRepository } from '../../../../../features/audit/domain/repositories/AuditRepository';
import { CreateBackup } from '../../../../../features/audit/domain/usecases';

describe('CreateBackup', () => {
  it('recorta la etiqueta y delega', async () => {
    const meta = {
      cid: 'c1',
      label: 'Salva',
      rev: 1,
      userId: 'u1',
      username: 'admin',
      createdAt: '2026-09-21',
    };
    const repo = mockOf<AuditRepository>({
      createBackup: vi.fn().mockResolvedValue(meta),
    });
    await expect(new CreateBackup(repo).execute('  Salva  ')).resolves.toEqual(meta);
    expect(repo.createBackup).toHaveBeenCalledWith('Salva');
  });
});
