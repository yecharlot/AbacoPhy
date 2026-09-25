import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';

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

/**
 * La ecuación del panel debe reflejar el plan de cuentas.
 * Prioridad: bloque `ecuacion` (saldos) > top-level assets/activo >
 * Nunca income_total/expense_total de asientos (descuadran vs cuentas).
 */
export const accountingMapper = {
  toAccount(dto: AccountDto): Account {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      type: dto.type as Account['type'],
      balance: n(dto.balance),
      currency: dto.currency,
    };
  },

  toEntry(dto: EntryDto): Entry {
    return {
      id: dto.id,
      date: dto.date,
      concept: dto.concept || dto.description || '',
      type: dto.type as Entry['type'],
      amount: n(dto.amount),
      currency: dto.currency,
      accountId: dto.account_id,
      accountName: dto.account_name,
      category: dto.category,
      tags: dto.tags,
    };
  },

  toEquation(dto: SummaryDto & Record<string, unknown>): Equation {
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

    return { assets, liabilities, equity, income, expenses, netProfit };
  },

  toEntryDto(entity: Omit<Entry, 'id'>): Record<string, unknown> {
    return {
      type: entity.type,
      account_id: entity.accountId,
      amount: entity.amount,
      description: entity.concept,
      date: entity.date,
      currency: entity.currency || undefined,
    };
  },
};
