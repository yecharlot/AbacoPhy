import type { PendingOperation, PushPayload, PushResult, SyncSnapshot } from '../entities/PendingOperation';

export interface SyncRepository {
  pullSnapshot(): Promise<SyncSnapshot>;
  pushQueue(payload: PushPayload): Promise<PushResult>;

  /** Local queue persistence */
  listQueue(): Promise<PendingOperation[]>;
  enqueue(op: Omit<PendingOperation, 'id' | 'createdAt'>): Promise<PendingOperation>;
  clearQueue(): Promise<void>;
  removeFromQueue(ids: string[]): Promise<void>;
  getClientRev(): Promise<number>;
  setClientRev(rev: number): Promise<void>;
}
