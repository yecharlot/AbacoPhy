import type { AppContainer } from '../../../infrastructure/di';
import { AccountingRepositoryImpl } from '../data/repositories/AccountingRepositoryImpl';
import {
  CreateExpenseEntry,
  CreateIncomeEntry,
  GetSummary,
  ListAccounts,
  ListEntries,
} from '../domain/usecases';
import { createAccountingStore, type AccountingStore } from '../ui/stores/accountingStore';

export type AccountingModule = {
  accountingStore: AccountingStore;
};

export function createAccountingModule(container: AppContainer): AccountingModule {
  const repo = new AccountingRepositoryImpl(container.http);
  const listAccounts = new ListAccounts(repo);
  const listEntries = new ListEntries(repo);
  const createIncome = new CreateIncomeEntry(repo);
  const createExpense = new CreateExpenseEntry(repo);
  const getSummary = new GetSummary(repo);

  const accountingStore = createAccountingStore({
    listAccounts,
    listEntries,
    createIncome,
    createExpense,
    getSummary,
  });

  return { accountingStore };
}
