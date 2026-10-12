import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { AuditRepository } from '../../../../../features/audit/domain/repositories/AuditRepository';
import { ListAuditTrail } from '../../../../../features/audit/domain/usecases';

describe('ListAuditTrail', () => {
  it('delega en getTrail', async () => {
    const trail = { events: [], rootCid: '', total: 0, limit: 200, offset: 0, actions: [] as string[] };
    const repo = mockOf<AuditRepository>({
      getTrail: vi.fn().mockResolvedValue(trail),
    });
    await expect(new ListAuditTrail(repo).execute()).resolves.toEqual(trail);
    expect(repo.getTrail).toHaveBeenCalledOnce();
  });

  it('pasa query de filtrado al repositorio', async () => {
    const trail = { events: [], rootCid: '', total: 0, limit: 50, offset: 0, actions: [] as string[] };
    const repo = mockOf<AuditRepository>({
      getTrail: vi.fn().mockResolvedValue(trail),
    });
    const q = { action: 'venta', q: 'mostrador', limit: 50 };
    await expect(new ListAuditTrail(repo).execute(q)).resolves.toEqual(trail);
    expect(repo.getTrail).toHaveBeenCalledWith(q);
  });
});
