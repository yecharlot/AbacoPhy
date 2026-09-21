import type { AppContainer } from '../../../infrastructure/di';
import { AccountingRepositoryImpl } from '../data/repositories/AccountingRepositoryImpl';
import { ListAccounts } from '../domain/usecases/ListAccounts';
import { ListEntries } from '../domain/usecases/ListEntries';
import { GetSummary } from '../domain/usecases/GetSummary';
import { CreateIncomeEntry } from '../domain/usecases/CreateIncomeEntry';
import { CreateExpenseEntry } from '../domain/usecases/CreateExpenseEntry';
import { createAccountingStore } from '../ui/stores/accountingStore';

export function createAccountingModule(container: AppContainer) {
  const repository = new AccountingRepositoryImpl(container.http);

  const listAccounts = new ListAccounts(repository);
  const listEntries = new ListEntries(repository);
  const getSummary = new GetSummary(repository);
  const createIncome = new CreateIncomeEntry(repository);
  const createExpense = new CreateExpenseEntry(repository);

  const accountingStore = createAccountingStore({
    listAccounts,
    listEntries,
    getSummary,
    createIncome,
    createExpense,
  });

  return {
    accountingStore,
  };
}
