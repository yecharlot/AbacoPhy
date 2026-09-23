import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { AuditRepository } from '../../../../../features/audit/domain/repositories/AuditRepository';
import { ListBackups } from '../../../../../features/audit/domain/usecases';

describe('ListBackups', () => {
  it('delega en getBackups', async () => {
    const snapshot = { backups: [], currentCid: '', rev: 0 };
    const repo = mockOf<AuditRepository>({
      getBackups: vi.fn().mockResolvedValue(snapshot),
    });
    await expect(new ListBackups(repo).execute()).resolves.toEqual(snapshot);
    expect(repo.getBackups).toHaveBeenCalledOnce();
  });
});
