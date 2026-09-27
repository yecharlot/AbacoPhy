import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type { TrialBalanceDto } from '../dto/TrialBalanceDto';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';
import type { JournalEntry } from '../../domain/entities/JournalEntry';
import type { TrialBalance } from '../../domain/entities/TrialBalance';
import { normalizeMetadataField, metadataToDto } from '../../../../infrastructure/domain/metadata';

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type EqBlock = {
  activo?: number;
  pasivo?: number;
  patrimonio?: number;
  ingresos?: number;
  gastos?: number;
  neto?: number;
  assets?: number;
  liabilities?: number;
  equity?: number;
  income?: number;
  expenses?: number;
  net_profit?: number;
  metadata?: string | null;

};

/**
 * Mapeo Entry API → lados Debe/Haber del libro diario.
 * Convención backend (ApplyDoubleEntry):
 *   income:  Debe activo (counterpart/caja) | Haber ingreso (account_id)
 *   expense: Debe gasto (account_id)        | Haber activo (counterpart)
 *   transfer/other: account_id ↔ counterpart
 */
function entrySides(dto: EntryDto): { debit: string; credit: string } {
  const resultLabel = dto.account_name?.trim() || dto.account_id || '—';
  const counterLabel = dto.counterpart?.trim() || '—';
  const t = (dto.type || '').toLowerCase();
  if (t === 'income') {
    return { debit: counterLabel, credit: resultLabel };
  }
  if (t === 'expense') {
    return { debit: resultLabel, credit: counterLabel };
  }
  return { debit: resultLabel, credit: counterLabel };
}


/** Resumen API → Equation/Summary (fuente de verdad del dashboard). */
export function summaryDtoToEntity(dto: SummaryDto & Record<string, unknown>): Equation {
  const eq = (dto.ecuacion ?? dto.equation ?? {}) as EqBlock;
  const hasEq = eq && typeof eq === 'object' && Object.keys(eq).length > 0;
  const fromEq = (k: keyof EqBlock) =>
    hasEq && eq[k] != null && eq[k] !== '' ? n(eq[k]) : null;

  const assets =
    fromEq('activo') ?? fromEq('assets') ?? n(dto.assets ?? dto.activo);
  const liabilities =
    fromEq('pasivo') ?? fromEq('liabilities') ?? n(dto.liabilities ?? dto.pasivo);
  const income =
    fromEq('ingresos') ??
    fromEq('income') ??
    n(dto.income ?? dto.ingresos ?? (dto as { income_total?: number }).income_total);
  const expenses =
    fromEq('gastos') ??
    fromEq('expenses') ??
    n(dto.expenses ?? dto.gastos ?? (dto as { expense_total?: number }).expense_total);
  const netProfit =
    fromEq('neto') ??
    fromEq('net_profit') ??
    n(dto.net_profit ?? dto.neto ?? (dto as { net?: number }).net) ??
    income - expenses;

  // Capital contable (cuentas equity). Puede ser 0 con ecuación ampliada.
  let equity =
    fromEq('patrimonio') ?? fromEq('equity') ?? n(dto.equity ?? dto.patrimonio);

  // Si el backend no manda patrimonio pero sí activo/pasivo, no inventamos equity
  // en el mapper: el KPI "Patrimonio neto" del dashboard usa assets - liabilities.

  return {
    assets,
    liabilities,
    equity,
    income,
    expenses,
    netProfit,
    metadata: normalizeMetadataField(dto),
  };
}

export function accountDtoToEntity(dto: AccountDto): Account {
  return accountingMapper.toAccount(dto);
}
export function entryDtoToEntity(dto: EntryDto): Entry {
  return {
    id: dto.id ?? '',
    type: (dto.type as Entry['type']) || 'transfer',
    accountId: dto.account_id ?? '',
    amount: n(dto.amount),
    description: (dto as { description?: string }).description || dto.concept || '',
    counterpart: dto.counterpart,
    date: dto.date ?? '',
    currency: dto.currency ?? '',
    metadata: normalizeMetadataField(dto),
  };
}
export function createInputToDto(input: { type: string; accountId: string; amount: number; description: string; counterpart?: string; date?: string; currency?: string; metadata?: string | null }): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: input.type,
    account_id: input.accountId,
    amount: input.amount,
    description: input.description,
  };
  if (input.counterpart) body.counterpart = input.counterpart;
  if (input.date) body.date = input.date;
  if (input.currency) body.currency = input.currency;
  const meta = metadataToDto(input);
  if (meta) body.metadata = meta;
  return body;
}
export function createResponseToResult(dto: EntryDto & { asiento?: EntryDto; entry?: EntryDto; ecuacion?: EqBlock; equation?: EqBlock; rev?: number; root_cid?: string }): { entry: Entry; equation: Equation | null; rev?: number; rootCid?: string } {
  const raw = dto.asiento ?? dto.entry ?? dto;
  return {
    entry: entryDtoToEntity(raw as EntryDto),
    equation: dto.ecuacion || dto.equation ? summaryDtoToEntity({ ecuacion: dto.ecuacion ?? dto.equation } as SummaryDto) : null,
    rev: dto.rev,
    rootCid: dto.root_cid,
  };
}

export const accountingMapper = {
  toAccount(dto: AccountDto): Account {
    return {
      id: dto.id,
      code: (dto as { code?: string }).code ?? '',
      name: (dto as { name?: string }).name ?? '',
      type: dto.type as Account['type'],
      balance: n(dto.balance),
      currency: (dto as { currency?: string }).currency ?? '',
      metadata: normalizeMetadataField(dto),
    };
  },

  toEntry(dto: EntryDto): Entry {
    const description = dto.description || dto.concept || '';
    return {
      id: dto.id,
      date: dto.date,
      description,
      concept: description,
      type: dto.type as Entry['type'],
      amount: n(dto.amount),
      currency: dto.currency ?? '',
      accountId: dto.account_id,
      accountName: dto.account_name,
      counterpart: dto.counterpart,
      category: dto.category,
      tags: dto.tags,
      metadata: normalizeMetadataField(dto),

    };
  },

  toEquation(dto: SummaryDto & Record<string, unknown>): Equation {
    return summaryDtoToEntity(dto);
  },

  toEntryDto(entity: Omit<Entry, 'id'>): Record<string, unknown> {
    return {
      type: entity.type,
      account_id: entity.accountId,
      amount: entity.amount,
      description: entity.concept,
      date: entity.date,
      currency: entity.currency || undefined,
      counterpart: entity.counterpart || undefined,
      metadata: metadataToDto(entity),
    };
  },
};

export const reportsMapper = {
  /** API real de /entries → fila de libro diario (no espera debit_account del wire). */
  entryToJournal(dto: EntryDto): JournalEntry {
    const { debit, credit } = entrySides(dto);
    return {
      id: dto.id,
      date: dto.date || '',
      description: dto.description || dto.concept || '',
      debitAccount: debit,
      creditAccount: credit,
      amount: n(dto.amount),
      type: (dto.type as JournalEntry['type']) || 'transfer',
      currency: dto.currency,
      accountId: dto.account_id,
      counterpartId: dto.counterpart,
      metadata: normalizeMetadataField(dto),

    };
  },

  toTrialBalance(dto: TrialBalanceDto): TrialBalance {
    return {
      accounts: (dto.accounts || []).map(reportsMapper.toTrialBalanceAccount),
      totalDebits: n(dto.total_debits),
      totalCredits: n(dto.total_credits),
      asOf: dto.as_of || '',
    };
  },

  toTrialBalanceAccount(dto: TrialBalanceDto['accounts'][number]): TrialBalance['accounts'][number] {
    return {
      accountId: dto.account_id,
      accountName: dto.account_name,
      accountCode: dto.account_code,
      debit: n(dto.debit),
      credit: n(dto.credit),
      balance: n(dto.balance),
    };
  },
};
