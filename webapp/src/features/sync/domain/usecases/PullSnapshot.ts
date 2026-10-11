import type { SyncSnapshot } from '../entities/PendingOperation';
import type { SyncRepository } from '../repositories/SyncRepository';

export class PullSnapshot {
  constructor(private readonly repo: SyncRepository) {}

  async execute(opts?: { full?: boolean }): Promise<SyncSnapshot> {
    const since = opts?.full ? undefined : await this.repo.getClientRev();
    const snap = await this.repo.pullSnapshot(since);
    if (!snap.uptodate) {
      await this.repo.setClientRev(snap.rev);
    }
    return snap;
  }
}
