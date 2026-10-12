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
    uptodate: Boolean(dto.uptodate),
    snapshot: dto.snapshot ?? null,
  };
}

export function pushPayloadToDto(payload: PushPayload): SyncPushRequestDto {
  return {
    entries: payload.entries,
    invoices: payload.invoices,
    inventory: payload.inventory,
    pos_sales: payload.posSales ?? [],
    client_rev: payload.clientRev,
    client_op_id: payload.clientOpId,
    force: payload.force,
  };
}

function sumApplied(applied: SyncPushResponseDto['applied']): number {
  if (typeof applied === 'number') return applied;
  if (applied && typeof applied === 'object') {
    return Object.values(applied).reduce((a, b) => a + Number(b || 0), 0);
  }
  return 0;
}

export function pushResponseToResult(dto: SyncPushResponseDto): PushResult {
  const appliedMap =
    dto.applied && typeof dto.applied === 'object' && !Array.isArray(dto.applied)
      ? (dto.applied as Record<string, number>)
      : undefined;
  return {
    rev: Number(dto.rev ?? 0),
    rootCid: dto.root_cid,
    accepted: Number(dto.accepted ?? sumApplied(dto.applied) ?? 0),
    idempotent: Boolean(dto.idempotent),
    applied: appliedMap,
    skipped: dto.skipped,
    conflict: dto.code === 'sync_conflict',
    serverRev: dto.server_rev,
    message: dto.error,
  };
}

export function opFromStorage(raw: {
  id: string;
  kind: string;
  body: Record<string, unknown>;
  createdAt: string;
}): PendingOperation {
  return {
    id: raw.id,
    kind: raw.kind as PendingOperation['kind'],
    body: raw.body,
    createdAt: raw.createdAt,
  };
}
