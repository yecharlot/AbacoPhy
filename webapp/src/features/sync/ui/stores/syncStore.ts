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
    async push(force = false): Promise<void> {
      if (!state.online) {
        set({ error: 'Sin conexión: no se puede empujar la cola' });
        return;
      }
      set({ status: 'syncing', error: null, message: null });
      try {
        const result = await deps.pushQueue.execute({ force });
        await refreshQueue();
        if (result.conflict) {
          set({
            status: 'error',
            error:
              result.message ||
              'Conflicto: el servidor tiene una revisión más nueva. Descargue snapshot y reintente.',
            lastRev: result.serverRev ?? result.rev ?? state.lastRev,
            message: null,
          });
          return;
        }
        const applied = result.applied
          ? Object.entries(result.applied)
              .map(([k, v]) => `${k}:${v}`)
              .join(' ')
          : `aceptados ${result.accepted}`;
        const msg = result.idempotent
          ? 'Push idempotente (lote ya aplicado). Cola limpia.'
          : `Push OK · rev ${result.rev} · ${applied}`;
        set({
          status: 'ok',
          lastRev: result.rev,
          message: msg,
          error: null,
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al empujar',
        });
      }
    },

    async pull(full = false): Promise<void> {
      if (!state.online) {
        set({ error: 'Sin conexión: no se puede descargar snapshot' });
        return;
      }
      set({ status: 'syncing', error: null, message: null });
      try {
        const snap = await deps.pullSnapshot.execute({ full });
        if (snap.uptodate) {
          set({
            status: 'ok',
            lastRev: snap.rev,
            message: `Ya está al día (rev ${snap.rev}).`,
            error: null,
          });
          return;
        }
        set({
          status: 'ok',
          lastRev: snap.rev,
          message: `Snapshot descargado · rev ${snap.rev}`,
          error: null,
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al descargar',
        });
      }
    },

    async refresh(): Promise<void> {
      await refreshQueue();
    },
  };
}

export type SyncStore = ReturnType<typeof createSyncStore>;
