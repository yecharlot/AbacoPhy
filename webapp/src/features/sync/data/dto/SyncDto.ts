export type SyncGetResponseDto = {
  rev?: number;
  root_cid?: string;
  rootCid?: string;
  snapshot?: unknown;
};

export type SyncPushRequestDto = {
  entries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  client_rev: number;
};

export type SyncPushResponseDto = {
  rev?: number;
  root_cid?: string;
  accepted?: number;
  applied?: number;
};

export type QueueStorageDto = {
  ops: {
    id: string;
    kind: string;
    body: Record<string, unknown>;
    createdAt: string;
  }[];
  clientRev: number;
};
