import type { PendingOperation, PushPayload, PushResult, SyncSnapshot } from '../entities/PendingOperation';

export interface SyncRepository {
  /** Pull; si sinceRev coincide con servidor → uptodate sin snapshot. */
  pullSnapshot(sinceRev?: number): Promise<SyncSnapshot>;
  pushQueue(payload: PushPayload): Promise<PushResult>;

  listQueue(): Promise<PendingOperation[]>;
  enqueue(op: Omit<PendingOperation, 'id' | 'createdAt'>): Promise<PendingOperation>;
  clearQueue(): Promise<void>;
  removeFromQueue(ids: string[]): Promise<void>;
  getClientRev(): Promise<number>;
  setClientRev(rev: number): Promise<void>;
}
