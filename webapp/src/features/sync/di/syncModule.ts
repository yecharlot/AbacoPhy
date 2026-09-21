import type { AppContainer } from '../../../infrastructure/di';
import { SyncRepositoryImpl } from '../data/repositories/SyncRepositoryImpl';
import {
  EnqueueOperation,
  ListPending,
  PullSnapshot,
  PushQueue,
} from '../domain/usecases';
import { createSyncStore, type SyncStore } from '../ui/stores/syncStore';

export type SyncModule = {
  syncStore: SyncStore;
  /** For accounting/invoicing to enqueue when offline */
  enqueueOperation: EnqueueOperation;
};

export function createSyncModule(container: AppContainer): SyncModule {
  const repo = new SyncRepositoryImpl(container.http, container.storage);
  const enqueueOperation = new EnqueueOperation(repo);
  const pushQueue = new PushQueue(repo);
  const pullSnapshot = new PullSnapshot(repo);
  const listPending = new ListPending(repo);

  const syncStore = createSyncStore({
    enqueue: enqueueOperation,
    pushQueue,
    pullSnapshot,
    listPending,
  });

  return { syncStore, enqueueOperation };
}
