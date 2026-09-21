/** Client-side queue item before POST /sync/push */

export type OperationKind = 'entry' | 'invoice' | 'inventory';

export type PendingOperation = {
  id: string;
  kind: OperationKind;
  /** Payload ready for API (snake_case fields as backend expects). */
  body: Record<string, unknown>;
  createdAt: string;
};

export type SyncSnapshot = {
  rev: number;
  rootCid: string;
  /** Opaque snapshot blob from server — not interpreted by domain. */
  snapshot: unknown;
};

export type PushPayload = {
  entries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  clientRev: number;
};

export type PushResult = {
  rev: number;
  rootCid?: string;
  accepted: number;
};
