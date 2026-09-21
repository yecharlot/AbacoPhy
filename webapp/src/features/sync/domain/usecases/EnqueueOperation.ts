import type { OperationKind, PendingOperation } from '../entities/PendingOperation';
import type { SyncRepository } from '../repositories/SyncRepository';

export class EnqueueOperation {
  constructor(private readonly repo: SyncRepository) {}

  execute(kind: OperationKind, body: Record<string, unknown>): Promise<PendingOperation> {
    if (!kind) throw new Error('Tipo de operación requerido');
    return this.repo.enqueue({ kind, body });
  }
}
