import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { KeyValueStorage } from '../../../../infrastructure/data/storage';
import type {
  PendingOperation,
  PushPayload,
  PushResult,
  SyncSnapshot,
} from '../../domain/entities/PendingOperation';
import type { SyncRepository } from '../../domain/repositories/SyncRepository';
import {
  opFromStorage,
  pushPayloadToDto,
  pushResponseToResult,
  snapshotDtoToEntity,
} from '../mappers/syncMapper';
import { SyncLocalQueue } from '../sources/SyncLocalQueue';
import { SyncRemoteSource } from '../sources/SyncRemoteSource';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'Error de sincronización';
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class SyncRepositoryImpl implements SyncRepository {
  private readonly remote: SyncRemoteSource;
  private readonly local: SyncLocalQueue;

  constructor(http: HttpClient, storage: KeyValueStorage) {
    this.remote = new SyncRemoteSource(http);
    this.local = new SyncLocalQueue(storage);
  }

  async pullSnapshot(): Promise<SyncSnapshot> {
    try {
      const dto = await this.remote.pull();
      return snapshotDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async pushQueue(payload: PushPayload): Promise<PushResult> {
    try {
      const dto = await this.remote.push(pushPayloadToDto(payload));
      return pushResponseToResult(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async listQueue(): Promise<PendingOperation[]> {
    return this.local.read().ops.map(opFromStorage);
  }

  async enqueue(
    op: Omit<PendingOperation, 'id' | 'createdAt'>,
  ): Promise<PendingOperation> {
    const data = this.local.read();
    const full: PendingOperation = {
      id: newId(),
      kind: op.kind,
      body: op.body,
      createdAt: new Date().toISOString(),
    };
    data.ops.push(full);
    this.local.write(data);
    return full;
  }

  async clearQueue(): Promise<void> {
    const data = this.local.read();
    data.ops = [];
    this.local.write(data);
  }

  async removeFromQueue(ids: string[]): Promise<void> {
    const set = new Set(ids);
    const data = this.local.read();
    data.ops = data.ops.filter((o) => !set.has(o.id));
    this.local.write(data);
  }

  async getClientRev(): Promise<number> {
    return this.local.read().clientRev;
  }

  async setClientRev(rev: number): Promise<void> {
    const data = this.local.read();
    data.clientRev = rev;
    this.local.write(data);
  }
}
