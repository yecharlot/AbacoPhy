import type { OperationKind, PendingOperation } from '../../domain/entities/PendingOperation';
import type { EnqueueOperation } from '../../domain/usecases/EnqueueOperation';
import type { ListPending } from '../../domain/usecases/ListPending';
import type { PullSnapshot } from '../../domain/usecases/PullSnapshot';
import type { PushQueue } from '../../domain/usecases/PushQueue';

export type SyncUiStatus = 'idle' | 'syncing' | 'error' | 'ok';

export type SyncState = {
  status: SyncUiStatus;
  pending: PendingOperation[];
  pendingCount: number;
  online: boolean;
  lastRev: number | null;
  error: string | null;
  message: string | null;
};

type Deps = {
  enqueue: EnqueueOperation;
  pushQueue: PushQueue;
  pullSnapshot: PullSnapshot;
  listPending: ListPending;
};

export function createSyncStore(deps: Deps) {
  let state: SyncState = {
    status: 'idle',
    pending: [],
    pendingCount: 0,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastRev: null,
    error: null,
    message: null,
  };
  const listeners = new Set<(s: SyncState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<SyncState>) {
    state = { ...state, ...partial };
    if (partial.pending) {
      state.pendingCount = partial.pending.length;
    }
    emit();
  }

  async function refreshQueue(): Promise<void> {
    const pending = await deps.listPending.execute();
    set({ pending, pendingCount: pending.length });
  }

  return {
    subscribe(fn: (s: SyncState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): SyncState {
      return state;
    },
    setOnline(online: boolean): void {
      set({ online });
    },
    async bootstrap(): Promise<void> {
      await refreshQueue();
    },
    async enqueue(kind: OperationKind, body: Record<string, unknown>): Promise<void> {
      await deps.enqueue.execute(kind, body);
      await refreshQueue();
      set({ message: 'Guardado en cola offline', error: null });
    },
    async push(): Promise<void> {
      if (!state.online) {
        set({ error: 'Sin conexión: no se puede empujar la cola' });
        return;
      }
      set({ status: 'syncing', error: null, message: null });
      try {
        const result = await deps.pushQueue.execute();
        await refreshQueue();
        set({
          status: 'ok',
          lastRev: result.rev,
          message:
            result.accepted > 0
              ? `Sincronizado: ${result.accepted} operación(es)`
              : 'Cola vacía',
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al sincronizar',
        });
      }
    },
    async pull(): Promise<void> {
      if (!state.online) {
        set({ error: 'Sin conexión: no se puede descargar snapshot' });
        return;
      }
      set({ status: 'syncing', error: null, message: null });
      try {
        const snap = await deps.pullSnapshot.execute();
        set({
          status: 'ok',
          lastRev: snap.rev,
          message: `Snapshot rev ${snap.rev}`,
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al obtener snapshot',
        });
      }
    },
    async refresh(): Promise<void> {
      await refreshQueue();
    },
  };
}

export type SyncStore = ReturnType<typeof createSyncStore>;
