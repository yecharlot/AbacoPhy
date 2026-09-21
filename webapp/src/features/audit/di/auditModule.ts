import type { AppContainer } from '../../../infrastructure/di';
import { AuditRepositoryImpl } from '../data/repositories/AuditRepositoryImpl';
import {
  CreateBackup,
  ExportBackup,
  ListAuditTrail,
  ListBackups,
  ListSystemErrors,
  RestoreBackup,
} from '../domain/usecases';
import { createAuditStore, type AuditStore } from '../ui/stores/auditStore';

export type AuditModule = {
  auditStore: AuditStore;
};

export function createAuditModule(container: AppContainer): AuditModule {
  const repo = new AuditRepositoryImpl(container.http);

  const auditStore = createAuditStore({
    listTrail: new ListAuditTrail(repo),
    listBackups: new ListBackups(repo),
    createBackup: new CreateBackup(repo),
    restoreBackup: new RestoreBackup(repo),
    exportBackup: new ExportBackup(repo),
    listSystemErrors: new ListSystemErrors(repo),
  });

  return { auditStore };
}
