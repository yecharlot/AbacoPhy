import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { AuditRepository } from '../../../../../features/audit/domain/repositories/AuditRepository';
import { ExportBackup } from '../../../../../features/audit/domain/usecases';

describe('ExportBackup', () => {
  it('delega en exportBackup', async () => {
    const blob = new Blob(['zip']);
    const repo = mockOf<AuditRepository>({
      exportBackup: vi.fn().mockResolvedValue(blob),
    });
    await expect(new ExportBackup(repo).execute()).resolves.toBe(blob);
    expect(repo.exportBackup).toHaveBeenCalledOnce();
  });
});
