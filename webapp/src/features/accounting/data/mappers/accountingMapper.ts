import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';

export const accountingMapper = {
  toAccount(dto: AccountDto): Account {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      type: dto.type as any,
      balance: dto.balance,
      currency: dto.currency,
    };
  },

  toEntry(dto: EntryDto): Entry {
    return {
      id: dto.id,
      date: dto.date,
      concept: dto.concept,
      type: dto.type as any,
      amount: dto.amount,
      currency: dto.currency,
      accountId: dto.account_id,
      accountName: dto.account_name,
      category: dto.category,
      tags: dto.tags,
    };
  },

  toEquation(dto: SummaryDto): Equation {
    return {
      assets: dto.assets,
      liabilities: dto.liabilities,
      equity: dto.equity,
      income: dto.income,
      expenses: dto.expenses,
      netProfit: dto.net_profit,
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
