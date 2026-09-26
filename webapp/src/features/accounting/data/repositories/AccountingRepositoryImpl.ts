import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Account } from '../../domain/entities/Account';
import type { Entry } from '../../domain/entities/Entry';
import type { Equation } from '../../domain/entities/Equation';
import type { AccountingRepository } from '../../domain/repositories/AccountingRepository';
import { AccountingRemoteSource } from '../sources/AccountingRemoteSource';
import {accountingMapper, reportsMapper} from '../mappers/accountingMapper';
import type {TrialBalance} from "../../domain/entities/TrialBalance";
import type { JournalEntry } from "../../domain/entities/JournalEntry";

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

  async getAccounts(): Promise<Account[]> {
    try {
      const res = await this.remote.getAccounts();
      return (res.accounts || []).map(accountingMapper.toAccount);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getTrialBalance(): Promise<TrialBalance> {
    try {
      const dto = await this.remote.getTrialBalance();
      return reportsMapper.toTrialBalance(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getJournal(params?: { limit?: number }): Promise<JournalEntry[]> {
    try {
      const res = await this.remote.getJournal(params);
      return (res.entries || []).map(reportsMapper.toJournalEntry);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getEntries(params?: { type?: string; from?: string; to?: string; limit?: number }): Promise<Entry[]> {
    try {
      const res = await this.remote.getEntries(params);
      return (res.entries || []).map(accountingMapper.toEntry);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getSummary(): Promise<Equation> {
    try {
      const dto = await this.remote.getSummary();
      return accountingMapper.toEquation(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async createEntry(entry: Omit<Entry, 'id'>): Promise<Entry> {
    try {
      const dto = await this.remote.createEntry(accountingMapper.toEntryDto(entry));
      return accountingMapper.toEntry(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
