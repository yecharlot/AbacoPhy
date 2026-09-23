import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { AuditRepository } from '../../../../../features/audit/domain/repositories/AuditRepository';
import { ListSystemErrors } from '../../../../../features/audit/domain/usecases';

describe('ListSystemErrors', () => {
  it('delega en getSystemErrors', async () => {
    const repo = mockOf<AuditRepository>({
      getSystemErrors: vi.fn().mockResolvedValue([]),
    });
    await expect(new ListSystemErrors(repo).execute()).resolves.toEqual([]);
    expect(repo.getSystemErrors).toHaveBeenCalledOnce();
  });
});
