import type { SyncSnapshot } from '../entities/PendingOperation';
import type { SyncRepository } from '../repositories/SyncRepository';

export class PullSnapshot {
  constructor(private readonly repo: SyncRepository) {}

  async execute(): Promise<SyncSnapshot> {
    const snap = await this.repo.pullSnapshot();
    await this.repo.setClientRev(snap.rev);
    return snap;
  }
}
