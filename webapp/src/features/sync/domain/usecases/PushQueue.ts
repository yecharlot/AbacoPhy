import type { PushResult } from '../entities/PendingOperation';
import type { SyncRepository } from '../repositories/SyncRepository';

function withClientOpId(body: Record<string, unknown>, opId: string): Record<string, unknown> {
  const meta =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? { ...(body.metadata as Record<string, unknown>) }
      : {};
  if (!meta.client_op_id) meta.client_op_id = opId;
  return { ...body, metadata: meta };
}

export class PushQueue {
  constructor(private readonly repo: SyncRepository) {}

  async execute(options?: { force?: boolean }): Promise<PushResult> {
    const queue = await this.repo.listQueue();
    if (queue.length === 0) {
      return { rev: await this.repo.getClientRev(), accepted: 0 };
    }

    const entries = queue
      .filter((o) => o.kind === 'entry')
      .map((o) => withClientOpId(o.body, o.id));
    const invoices = queue
      .filter((o) => o.kind === 'invoice')
      .map((o) => withClientOpId(o.body, o.id));
    const inventory = queue
      .filter((o) => o.kind === 'inventory')
      .map((o) => withClientOpId(o.body, o.id));
    const posSales = queue
      .filter((o) => o.kind === 'pos_sale')
      .map((o) => withClientOpId(o.body, o.id));
    const clientRev = await this.repo.getClientRev();
    const batchId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `batch-${Date.now()}`;

    const result = await this.repo.pushQueue({
      entries,
      invoices,
      inventory,
      posSales,
      clientRev,
      clientOpId: batchId,
      force: options?.force,
    });

    if (result.conflict) {
      return result;
    }

    await this.repo.clearQueue();
    if (result.rev != null) {
      await this.repo.setClientRev(result.rev);
    }
    return result;
  }
}
