import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Account } from '../../domain/entities/Account';
import type { CreateEntryInput, Entry } from '../../domain/entities/Entry';
import type { Summary } from '../../domain/entities/Equation';
import type {
  AccountingRepository,
  CreateEntryResult,
  EntriesQuery,
} from '../../domain/repositories/AccountingRepository';
import type { JournalEntry } from '../../domain/entities/JournalEntry';
import type { TrialBalance } from '../../domain/entities/TrialBalance';

import {
  accountDtoToEntity,
  createInputToDto,
  createResponseToResult,
  entryDtoToEntity,
  summaryDtoToEntity,
  reportsMapper,
} from '../mappers/accountingMapper';
import { AccountingRemoteSource } from '../sources/AccountingRemoteSource';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class AccountingRepositoryImpl implements AccountingRepository {
  private readonly remote: AccountingRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new AccountingRemoteSource(http);
  }

  async listAccounts(): Promise<Account[]> {
    try {
      const dto = await this.remote.getAccounts();
      return (dto.accounts ?? []).map(accountDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async listEntries(params?: EntriesQuery): Promise<Entry[]> {
    try {
      const dto = await this.remote.getEntries(params);
      const raw = (dto as { entries?: EntryDtoLike[]; asientos?: EntryDtoLike[] }).entries
        ?? (dto as { asientos?: EntryDtoLike[] }).asientos
        ?? [];
      return raw.map(entryDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createEntry(input: CreateEntryInput): Promise<CreateEntryResult> {
    try {
      const entryDto = await this.remote.createEntry(createInputToDto(input));
      return createResponseToResult(entryDto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getSummary(): Promise<Summary> {
    try {
      const dto = await this.remote.getSummary();
      return summaryDtoToEntity(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getJournal(params?: EntriesQuery): Promise<JournalEntry[]> {
    try {
      const dto = await this.remote.getEntries(params);
      return (dto.entries ?? []).map(reportsMapper.entryToJournal);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getTrialBalance(): Promise<TrialBalance> {
    const accounts = await this.listAccounts();
    const rows = accounts.map((account) => {
      const balance = account.balance;
      const debit = ['asset', 'expense'].includes(account.type)
          ? Math.max(balance, 0)
          : Math.max(-balance, 0);
      const credit = ['asset', 'expense'].includes(account.type)
          ? Math.max(-balance, 0)
          : Math.max(balance, 0);
      return { accountId: account.id, accountName: account.name, accountCode: account.code, debit, credit, balance };
    });
    return {
      accounts: rows,
      totalDebits: rows.reduce((total, row) => total + row.debit, 0),
      totalCredits: rows.reduce((total, row) => total + row.credit, 0),
      asOf: new Date().toISOString(),
    };
  }
}

type EntryDtoLike = Parameters<typeof entryDtoToEntity>[0];
