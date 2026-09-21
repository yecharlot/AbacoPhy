import type { AuditEvent } from '../../domain/entities/AuditEvent';
import type { BackupMeta } from '../../domain/entities/Backup';
import type {
  CreateBackup,
  ExportBackup,
  ListAuditTrail,
  ListBackups,
  ListSystemErrors,
  RestoreBackup,
} from '../../domain/usecases';

export type AuditStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type AuditState = {
  status: AuditStatus;
  events: AuditEvent[];
  rootCid: string;
  backups: BackupMeta[];
  currentCid: string;
  rev: number;
  systemErrors: AuditEvent[];
  error: string | null;
  saving: boolean;
};

type Deps = {
  listTrail: ListAuditTrail;
  listBackups: ListBackups;
  createBackup: CreateBackup;
  restoreBackup: RestoreBackup;
  exportBackup: ExportBackup;
  listSystemErrors: ListSystemErrors;
};

export function createAuditStore(deps: Deps) {
  let state: AuditState = {
    status: 'idle',
    events: [],
    rootCid: '',
    backups: [],
    currentCid: '',
    rev: 0,
    systemErrors: [],
    error: null,
    saving: false,
  };
  const listeners = new Set<(s: AuditState) => void>();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function set(partial: Partial<AuditState>) {
    state = { ...state, ...partial };
    emit();
  }

  function messageOf(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }

  return {
    subscribe(fn: (s: AuditState) => void): () => void {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    getState(): AuditState {
      return state;
    },
    async loadAll(): Promise<void> {
      set({ status: 'loading', error: null });
      try {
        const [trail, backups] = await Promise.all([
          deps.listTrail.execute(),
          deps.listBackups
            .execute()
            .catch(() => ({ backups: [] as BackupMeta[], currentCid: '', rev: 0 })),
        ]);
        set({
          status: trail.events.length ? 'success' : 'empty',
          events: trail.events,
          rootCid: trail.rootCid,
          backups: backups.backups,
          currentCid: backups.currentCid,
          rev: backups.rev,
          error: null,
        });
      } catch (err) {
        set({ status: 'error', error: messageOf(err, 'Error al cargar la traza') });
      }
    },
    /** Solo tiene sentido con rol master; el backend responde 403 en otro caso. */
    async loadSystemErrors(): Promise<void> {
      try {
        const systemErrors = await deps.listSystemErrors.execute();
        set({ systemErrors });
      } catch {
        set({ systemErrors: [] });
      }
    },
    async saveBackup(label: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.createBackup.execute(label);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al crear la salva') });
        throw err;
      }
    },
    async restore(cid: string): Promise<void> {
      set({ saving: true, error: null });
      try {
        await deps.restoreBackup.execute(cid);
        set({ saving: false });
        await this.loadAll();
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al restaurar la salva') });
        throw err;
      }
    },
    async exportBackup(): Promise<Blob> {
      set({ saving: true, error: null });
      try {
        const blob = await deps.exportBackup.execute();
        set({ saving: false });
        return blob;
      } catch (err) {
        set({ saving: false, error: messageOf(err, 'Error al exportar la salva') });
        throw err;
      }
    },
  };
}

export type AuditStore = ReturnType<typeof createAuditStore>;
