import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { AuditRepository } from '../../../../../features/audit/domain/repositories/AuditRepository';
import { ListAuditTrail } from '../../../../../features/audit/domain/usecases';

describe('ListAuditTrail', () => {
  it('delega en getTrail', async () => {
    const trail = { events: [], rootCid: '' };
    const repo = mockOf<AuditRepository>({
      getTrail: vi.fn().mockResolvedValue(trail),
    });
    await expect(new ListAuditTrail(repo).execute()).resolves.toEqual(trail);
    expect(repo.getTrail).toHaveBeenCalledOnce();
  });
});
