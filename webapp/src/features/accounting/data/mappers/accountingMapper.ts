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
      concept: dto.concept,
      type: dto.type as Entry['type'],
      amount: n(dto.amount),
      currency: dto.currency,
      accountId: dto.account_id,
      accountName: dto.account_name,
      category: dto.category,
      tags: dto.tags,
    };
  },

  toEquation(dto: SummaryDto): Equation {
    const eq = dto.ecuacion ?? dto.equation;
    return {
      assets: n(dto.assets ?? dto.activo ?? (eq as { activo?: number; assets?: number } | undefined)?.activo ?? (eq as { assets?: number } | undefined)?.assets),
      liabilities: n(
        dto.liabilities ??
          dto.pasivo ??
          (eq as { pasivo?: number; liabilities?: number } | undefined)?.pasivo ??
          (eq as { liabilities?: number } | undefined)?.liabilities,
      ),
      equity: n(
        dto.equity ??
          dto.patrimonio ??
          (eq as { patrimonio?: number; equity?: number } | undefined)?.patrimonio ??
          (eq as { equity?: number } | undefined)?.equity,
      ),
      income: n(
        dto.income ??
          dto.ingresos ??
          (eq as { ingresos?: number; income?: number } | undefined)?.ingresos ??
          (eq as { income?: number } | undefined)?.income,
      ),
      expenses: n(
        dto.expenses ??
          dto.gastos ??
          (eq as { gastos?: number; expenses?: number } | undefined)?.gastos ??
          (eq as { expenses?: number } | undefined)?.expenses,
      ),
      netProfit: n(
        dto.net_profit ??
          dto.neto ??
          (eq as { neto?: number; net_profit?: number } | undefined)?.neto ??
          (eq as { net_profit?: number } | undefined)?.net_profit,
      ),
    };
  },

  toEntryDto(entity: Omit<Entry, 'id'>): Partial<EntryDto> {
    return {
      date: entity.date,
      concept: entity.concept,
      type: entity.type,
      amount: entity.amount,
      currency: entity.currency,
      account_id: entity.accountId,
      category: entity.category,
      tags: entity.tags,
    };
  },
};
