import type { Account, AccountType } from '../../domain/entities/Account';
import type { CreateEntryInput, Entry, EntryType } from '../../domain/entities/Entry';
import type { Equation, Summary } from '../../domain/entities/Equation';
import type {
  AccountDto,
  CreateEntryRequestDto,
  CreateEntryResponseDto,
  EntryDto,
  EquationDto,
  SummaryResponseDto,
} from '../dto/AccountingDto';
import type { CreateEntryResult } from '../../domain/repositories/AccountingRepository';

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];
const ENTRY_TYPES: EntryType[] = ['income', 'expense', 'transfer'];

function asAccountType(v: string | undefined): AccountType {
  return ACCOUNT_TYPES.includes(v as AccountType) ? (v as AccountType) : 'asset';
}

function asEntryType(v: string | undefined): EntryType {
  return ENTRY_TYPES.includes(v as EntryType) ? (v as EntryType) : 'income';
}

export function accountDtoToEntity(dto: AccountDto): Account {
  return {
    id: dto.id,
    code: String(dto.code ?? ''),
    name: String(dto.name ?? ''),
    type: asAccountType(dto.type),
    balance: Number(dto.balance ?? 0),
  };
}

export function entryDtoToEntity(dto: EntryDto): Entry {
  return {
    id: String(dto.id ?? ''),
    type: asEntryType(dto.type),
    accountId: String(dto.account_id ?? ''),
    amount: Number(dto.amount ?? 0),
    description: String(dto.description ?? ''),
    counterpart: dto.counterpart,
    date: String(dto.date ?? ''),
    currency: String(dto.currency ?? ''),
  };
}

export function equationDtoToEntity(dto: EquationDto | undefined | null): Equation | null {
  if (!dto) return null;
  return {
    activo: Number(dto.activo ?? 0),
    pasivo: Number(dto.pasivo ?? 0),
    patrimonio: Number(dto.patrimonio ?? 0),
    ingresos: Number(dto.ingresos ?? 0),
    gastos: Number(dto.gastos ?? 0),
    neto: Number(dto.neto ?? 0),
    pasivoPatrimonioNeto: Number(dto.pasivo_patrimonio_neto ?? 0),
  };
}

export function createInputToDto(input: CreateEntryInput): CreateEntryRequestDto {
  return {
    type: input.type,
    account_id: input.accountId,
    amount: input.amount,
    description: input.description,
    counterpart: input.counterpart,
    date: input.date,
    currency: input.currency,
  };
}

export function createResponseToResult(dto: CreateEntryResponseDto): CreateEntryResult {
  const raw = dto.asiento ?? dto.entry ?? {};
  return {
    entry: entryDtoToEntity(raw),
    equation: equationDtoToEntity(dto.ecuacion),
    rev: dto.rev,
    rootCid: dto.root_cid,
  };
}

export function summaryDtoToEntity(dto: SummaryResponseDto): Summary {
  const equation =
    equationDtoToEntity(dto.ecuacion ?? dto.equation) ?? {
      activo: 0,
      pasivo: 0,
      patrimonio: 0,
      ingresos: 0,
      gastos: 0,
      neto: 0,
      pasivoPatrimonioNeto: 0,
    };
  return {
    ingresos: Number(dto.ingresos ?? dto.income ?? equation.ingresos),
    gastos: Number(dto.gastos ?? dto.expense ?? equation.gastos),
    neto: Number(dto.neto ?? equation.neto),
    equation,
    rev: dto.rev,
    rootCid: dto.root_cid,
  };
}
