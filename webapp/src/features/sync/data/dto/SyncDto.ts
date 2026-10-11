export type SyncGetResponseDto = {
  rev?: number;
  root_cid?: string;
  rootCid?: string;
  uptodate?: boolean;
  snapshot?: unknown;
  server_time?: string;
  metadata?: string | null;
};

export type SyncPushRequestDto = {
  entries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  pos_sales?: Record<string, unknown>[];
  client_rev: number;
  client_op_id?: string;
  force?: boolean;
  metadata?: string | null;
};

export type SyncPushResponseDto = {
  ok?: boolean;
  rev?: number;
  root_cid?: string;
  accepted?: number;
  applied?: number | Record<string, number>;
  skipped?: Record<string, number>;
  idempotent?: boolean;
  error?: string;
  code?: string;
  server_rev?: number;
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
  metadata?: string | null;
};
