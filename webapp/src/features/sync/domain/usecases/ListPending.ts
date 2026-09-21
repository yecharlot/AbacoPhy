import type { PendingOperation } from '../entities/PendingOperation';
import type { SyncRepository } from '../repositories/SyncRepository';

export class ListPending {
  constructor(private readonly repo: SyncRepository) {}

  execute(): Promise<PendingOperation[]> {
    return this.repo.listQueue();
  }
}
