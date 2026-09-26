import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type { TrialBalanceDto } from '../dto/TrialBalanceDto';
import type { Account } from '../../domain/entities/Account';
import type { CreateEntryInput, Entry } from '../../domain/entities/Entry';
import type { Equation, Summary } from '../../domain/entities/Equation';
import type { JournalEntry } from '../../domain/entities/JournalEntry';
import type { TrialBalance } from '../../domain/entities/TrialBalance';
import type { CreateEntryResult } from '../../domain/repositories/AccountingRepository';
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
};

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

/** DTO cuenta → entidad (export nombrado que usa AccountingRepositoryImpl). */
export function accountDtoToEntity(dto: AccountDto): Account {
  return {
    id: dto.id,
    code: dto.code ?? '',
    name: dto.name ?? '',
    type: dto.type as Account['type'],
    balance: n(dto.balance),
    metadata: normalizeMetadataField(dto),
  };
}

/** DTO asiento → entidad. */
export function entryDtoToEntity(dto: EntryDto): Entry {
  return {
    id: dto.id ?? '',
    type: (dto.type as Entry['type']) || 'transfer',
    accountId: dto.account_id ?? '',
    amount: n(dto.amount),
    description: dto.description || dto.concept || '',
    counterpart: dto.counterpart,
    date: dto.date ?? '',
    currency: dto.currency ?? '',
    metadata: normalizeMetadataField(dto),
  };
}

/** Input de creación → body API. */
export function createInputToDto(input: CreateEntryInput): Record<string, unknown> {
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

/** Respuesta create entry → CreateEntryResult. */
export function createResponseToResult(
  dto: EntryDto & {
    asiento?: EntryDto;
    entry?: EntryDto;
    ecuacion?: EqBlock;
    equation?: EqBlock;
    rev?: number;
    root_cid?: string;
  },
): CreateEntryResult {
  const raw = dto.asiento ?? dto.entry ?? dto;
  const entry = entryDtoToEntity(raw as EntryDto);
  const eqBlock = (dto.ecuacion ?? dto.equation) as EqBlock | undefined;
  let equation: Equation | null = null;
  if (eqBlock && typeof eqBlock === 'object') {
    equation = summaryDtoToEntity({ ecuacion: eqBlock } as SummaryDto);
  }
  return {
    entry,
    equation,
    rev: dto.rev,
    rootCid: dto.root_cid,
  };
}

/** Summary/ecuación API → entidad. */
export function summaryDtoToEntity(dto: SummaryDto & Record<string, unknown>): Summary {
  const eq = (dto.ecuacion ?? dto.equation ?? {}) as EqBlock;
  const hasEq = eq && typeof eq === 'object' && Object.keys(eq).length > 0;
  const fromEq = (k: keyof EqBlock) => (hasEq && eq[k] != null ? n(eq[k]) : null);

  const assets =
    fromEq('activo') ?? fromEq('assets') ?? n(dto.assets ?? dto.activo);
  const liabilities =
    fromEq('pasivo') ?? fromEq('liabilities') ?? n(dto.liabilities ?? dto.pasivo);
  const equity =
    fromEq('patrimonio') ?? fromEq('equity') ?? n(dto.equity ?? dto.patrimonio);
  const income =
    fromEq('ingresos') ?? fromEq('income') ?? n(dto.income ?? dto.ingresos);
  const expenses =
    fromEq('gastos') ?? fromEq('expenses') ?? n(dto.expenses ?? dto.gastos);
  const netProfit =
    fromEq('neto') ??
    fromEq('net_profit') ??
    n(dto.net_profit ?? dto.neto) ??
    income - expenses;

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

/** API object-style (pantallas/reportes). */
export const accountingMapper = {
  toAccount: accountDtoToEntity,
  toEntry: entryDtoToEntity,
  toEquation: summaryDtoToEntity,
  toEntryDto(entity: Omit<Entry, 'id'> & { concept?: string }): Record<string, unknown> {
    return {
      type: entity.type,
      account_id: entity.accountId,
      amount: entity.amount,
      description: entity.description || entity.concept || '',
      date: entity.date,
      currency: entity.currency || undefined,
      counterpart: entity.counterpart || undefined,
      metadata: metadataToDto(entity),
    };
  },
};

export const reportsMapper = {
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

  toTrialBalanceAccount(
    dto: TrialBalanceDto['accounts'][number],
  ): TrialBalance['accounts'][number] {
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
