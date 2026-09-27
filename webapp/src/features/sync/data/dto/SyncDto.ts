export type SyncGetResponseDto = {
  rev?: number;
  root_cid?: string;
  rootCid?: string;
  snapshot?: unknown;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type SyncPushRequestDto = {
  entries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  client_rev: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type SyncPushResponseDto = {
  rev?: number;
  root_cid?: string;
  accepted?: number;
  applied?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type QueueStorageDto = {
  ops: {
    id: string;
    kind: string;
    body: Record<string, unknown>;
    createdAt: string;
  }[];
  clientRev: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
