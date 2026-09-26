import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { Account } from '../../domain/entities/Account';
import type { CreateEntryInput, Entry } from '../../domain/entities/Entry';
import type { Summary } from '../../domain/entities/Equation';
import type {
  AccountingRepository,
  CreateEntryResult,
} from '../../domain/repositories/AccountingRepository';
import {
  accountDtoToEntity,
  createInputToDto,
  createResponseToResult,
  entryDtoToEntity,
  summaryDtoToEntity,
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

  async listEntries(): Promise<Entry[]> {
    try {
      const dto = await this.remote.getEntries();
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
}

type EntryDtoLike = Parameters<typeof entryDtoToEntity>[0];
