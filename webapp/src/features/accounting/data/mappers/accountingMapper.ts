import type { AccountDto } from '../dto/AccountDto';
import type { EntryDto } from '../dto/EntryDto';
import type { SummaryDto } from '../dto/SummaryDto';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';
import type {JournalEntry} from "../../domain/entities/JournalEntry";
import type {JournalEntryDto} from "../dto/JournalEntryDto";
import type {TrialBalanceDto} from "../dto/TrialBalanceDto";
import type {TrialBalance} from "../../domain/entities/TrialBalance";

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
    return {
      assets: n(
        dto.assets ??
          dto.activo ??
          eq.activo ??
          eq.assets,
      ),
      liabilities: n(
        dto.liabilities ??
          dto.pasivo ??
          eq.pasivo ??
          eq.liabilities,
      ),
      equity: n(
        dto.equity ??
          dto.patrimonio ??
          eq.patrimonio ??
          eq.equity,
      ),
      income: n(
        dto.income ??
          dto.ingresos ??
          (dto as { income_total?: number }).income_total ??
          eq.ingresos ??
          eq.income,
      ),
      expenses: n(
        dto.expenses ??
          dto.gastos ??
          (dto as { expense_total?: number }).expense_total ??
          eq.gastos ??
          eq.expenses,
      ),
      netProfit: n(
        dto.net_profit ??
          dto.neto ??
          (dto as { net?: number }).net ??
          eq.neto ??
          eq.net_profit,
      ),
    };
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


export const reportsMapper = {

    toJournalEntry(dto: JournalEntryDto): JournalEntry {
      return {
        id: dto.id,
        date: dto.date,
        description: dto.description,
        debitAccount: dto.debit_account,
        creditAccount: dto.credit_account,
        amount: n(dto.amount),
        type: dto.type as JournalEntry['type'],
      };
    },

    toTrialBalance(dto: TrialBalanceDto): TrialBalance {
      return {
        accounts: (dto.accounts || []).map(reportsMapper.toTrialBalanceAccount),
        totalDebits: n(dto.total_debits),
        totalCredits: n(dto.total_credits),
        asOf: dto.as_of,
      }
    },

    toTrialBalanceAccount(dto: TrialBalanceDto['accounts'][number]): TrialBalance['accounts'][number] {
      return {
        accountId: dto.account_id,
        accountName: dto.account_name,
        accountCode: dto.account_code,
        debit: n(dto.debit),
        credit: n(dto.credit),
        balance: n(dto.balance),
      }
    }
}