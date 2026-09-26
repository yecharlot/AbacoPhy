/** Client-side queue item before POST /sync/push */

export type OperationKind = 'entry' | 'invoice' | 'inventory';

export type PendingOperation = {
  id: string;
  kind: OperationKind;
  /** Payload ready for API (snake_case fields as backend expects). */
  body: Record<string, unknown>;
  createdAt: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type SyncSnapshot = {
  rev: number;
  rootCid: string;
  /** Opaque snapshot blob from server — not interpreted by domain. */
  snapshot: unknown;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type PushPayload = {
  entries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  clientRev: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type PushResult = {
  rev: number;
  rootCid?: string;
  accepted: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
