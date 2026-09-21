import type {
  PendingOperation,
  PushPayload,
  PushResult,
  SyncSnapshot,
} from '../../domain/entities/PendingOperation';
import type { SyncGetResponseDto, SyncPushRequestDto, SyncPushResponseDto } from '../dto/SyncDto';

export function snapshotDtoToEntity(dto: SyncGetResponseDto): SyncSnapshot {
  return {
    rev: Number(dto.rev ?? 0),
    rootCid: String(dto.root_cid ?? dto.rootCid ?? ''),
    snapshot: dto.snapshot ?? null,
  };
}

export function pushPayloadToDto(payload: PushPayload): SyncPushRequestDto {
  return {
    entries: payload.entries,
    invoices: payload.invoices,
    inventory: payload.inventory,
    client_rev: payload.clientRev,
  };
}

export function pushResponseToResult(dto: SyncPushResponseDto): PushResult {
  return {
    rev: Number(dto.rev ?? 0),
    rootCid: dto.root_cid,
    accepted: Number(dto.accepted ?? dto.applied ?? 0),
  };
}

export function opFromStorage(raw: {
  id: string;
  kind: string;
  body: Record<string, unknown>;
  createdAt: string;
}): PendingOperation {
  const kind = raw.kind === 'invoice' || raw.kind === 'inventory' ? raw.kind : 'entry';
  return {
    id: raw.id,
    kind,
    body: raw.body ?? {},
    createdAt: raw.createdAt,
  };
}
