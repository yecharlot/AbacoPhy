export type ReceptionLine = {
  productId: string;
  productCode: string;
  productName: string;
  unit?: string;
  qty: number;
  unitCost: number;
  amount: number;
  metadata?: string | null;
};

export type ReceptionStatus =
  | 'pendiente_entrada'
  | 'entrado'
  | 'problemas_entrada'
  | 'anulado'
  | string;

export type ReceptionVisualStatus =
  | 'pending_entry'
  | 'entry_confirmed'
  | 'entry_problem'
  | 'abandoned'
  | 'cancelled';

export const RECEPTION_ABANDON_MARKER = '[ABANDONADO]';

export type ReceptionMetadata = {
  receptionStatus?: ReceptionVisualStatus;
  problemReason?: string;
  abandonReason?: string;
  entryActor?: string;
  entryAt?: string;
};

export type Reception = {
  id: string;
  number: string;
  date: string;
  hasInvoice: boolean;
  invoiceRef?: string;
  supplier: string;
  receiver: string;
  docRef: string;
  lines: ReceptionLine[];
  totalCost: number;
  currency: string;
  status: ReceptionStatus;
  note: string;
  enteredBy?: string;
  enteredAt?: string;
  metadata?: string | null;
  metadataState?: ReceptionMetadata;
};

export type CreateReceptionLineInput = {
  productId: string;
  qty: number;
  unitCost: number;
  unit?: string;
  metadata?: string | null;
};

export type CreateReceptionInput = {
  hasInvoice: boolean;
  invoiceRef?: string;
  supplier?: string;
  receiver: string;
  docRef?: string;
  date?: string;
  note?: string;
  lines: CreateReceptionLineInput[];
  metadata?: string | null;
};

export type EnterReceptionInput = {
  id: string;
  accept: boolean;
  /** FE: marca reason con [ABANDONADO]; no cambia schema API. */
  abandon?: boolean;
  note?: string;
  reason?: string;
  metadata?: string | null;
};

function textLooksAbandoned(...parts: (string | null | undefined)[]): boolean {
  for (const p of parts) {
    if (!p) continue;
    if (String(p).includes(RECEPTION_ABANDON_MARKER)) return true;
    if (/^\s*ABANDONO\s*:/i.test(String(p))) return true;
  }
  return false;
}

export function isReceptionAbandoned(reception: Reception): boolean {
  if (reception.status === 'anulado') return true;
  const st = reception.metadataState?.receptionStatus;
  if (st === 'abandoned' || st === 'cancelled') return true;
  if (reception.metadataState?.abandonReason) return true;
  return textLooksAbandoned(
    reception.metadataState?.problemReason,
    reception.metadataState?.abandonReason,
    reception.note,
  );
}

export function receptionAbandonReason(reception: Reception): string {
  const raw =
    reception.metadataState?.abandonReason ||
    reception.metadataState?.problemReason ||
    reception.note ||
    '';
  const clean = raw
    .replace(RECEPTION_ABANDON_MARKER, '')
    .replace(/^\s*ABANDONO\s*:\s*/i, '')
    .replace(/^[\s·]+/, '')
    .trim();
  return clean || 'Sin motivo registrado';
}

export function getReceptionVisualStatus(reception: Reception): ReceptionVisualStatus {
  if (isReceptionAbandoned(reception)) return 'abandoned';
  const metadataStatus = reception.metadataState?.receptionStatus;
  if (
    metadataStatus === 'pending_entry' ||
    metadataStatus === 'entry_confirmed' ||
    metadataStatus === 'entry_problem'
  ) {
    return metadataStatus;
  }
  switch (reception.status) {
    case 'entrado':
      return 'entry_confirmed';
    case 'problemas_entrada':
      return 'entry_problem';
    case 'anulado':
      return 'abandoned';
    default:
      return 'pending_entry';
  }
}

export function receptionStatusLabel(visual: ReceptionVisualStatus): string {
  switch (visual) {
    case 'pending_entry':
      return 'Pendiente dar entrada';
    case 'entry_confirmed':
      return 'Entrada confirmada';
    case 'entry_problem':
      return 'Problema con la entrada';
    case 'abandoned':
    case 'cancelled':
      return 'Abandonada';
    default:
      return visual;
  }
}
