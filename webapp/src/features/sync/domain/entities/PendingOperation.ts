/** Client-side queue item before POST /sync/push */

export type OperationKind = 'entry' | 'invoice' | 'inventory' | 'pos_sale';

export type PendingOperation = {
  id: string;
  kind: OperationKind;
  /** Payload ready for API (snake_case fields as backend expects). */
  body: Record<string, unknown>;
  createdAt: string;
  metadata?: string | null;
};

export type SyncSnapshot = {
  rev: number;
  rootCid: string;
  /** true si since_rev coincide y no hay snapshot */
  uptodate: boolean;
  snapshot: unknown;
  metadata?: string | null;
};

export type PushPayload = {
  entries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  posSales: Record<string, unknown>[];
  clientRev: number;
  /** Idempotencia de lote (P8). */
  clientOpId?: string;
  force?: boolean;
  metadata?: string | null;
};

export type PushResult = {
  rev: number;
  rootCid?: string;
  accepted: number;
  idempotent?: boolean;
  applied?: Record<string, number>;
  skipped?: Record<string, number>;
  conflict?: boolean;
  serverRev?: number;
  message?: string;
  metadata?: string | null;
};
