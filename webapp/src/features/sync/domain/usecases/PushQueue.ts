import type { PushResult } from '../entities/PendingOperation';
import type { SyncRepository } from '../repositories/SyncRepository';

export class PushQueue {
  constructor(private readonly repo: SyncRepository) {}

  async execute(): Promise<PushResult> {
    const queue = await this.repo.listQueue();
    if (queue.length === 0) {
      return { rev: await this.repo.getClientRev(), accepted: 0 };
    }

    const entries = queue.filter((o) => o.kind === 'entry').map((o) => o.body);
    const invoices = queue.filter((o) => o.kind === 'invoice').map((o) => o.body);
    const inventory = queue.filter((o) => o.kind === 'inventory').map((o) => o.body);
    const clientRev = await this.repo.getClientRev();

    const result = await this.repo.pushQueue({
      entries,
      invoices,
      inventory,
      clientRev,
    });

    await this.repo.clearQueue();
    if (result.rev != null) {
      await this.repo.setClientRev(result.rev);
    }
    return result;
  }
}
