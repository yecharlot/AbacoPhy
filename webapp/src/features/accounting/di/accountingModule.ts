import type { AppContainer } from '../../../infrastructure/di';
import { AccountingRepositoryImpl } from '../data/repositories/AccountingRepositoryImpl';
import { ListAccounts } from '../domain/usecases/ListAccounts';
import { ListEntries } from '../domain/usecases/ListEntries';
import { GetSummary } from '../domain/usecases/GetSummary';
import { CreateIncomeEntry } from '../domain/usecases/CreateIncomeEntry';
import { CreateExpenseEntry } from '../domain/usecases/CreateExpenseEntry';
import { GetTrialBalance } from '../domain/usecases/GetTrialBalance';
import { GetIncomeStatement } from '../domain/usecases/GetIncomeStatement';
import { GetJournal } from '../domain/usecases/GetJournal';
import { createAccountingStore } from '../ui/stores/accountingStore';
import { createReportsStore } from '../ui/stores/reportsStore';

export function createAccountingModule(container: AppContainer) {
  const repository = new AccountingRepositoryImpl(container.http);

  const listAccounts = new ListAccounts(repository);
  const listEntries = new ListEntries(repository);
  const getSummary = new GetSummary(repository);
  const createIncome = new CreateIncomeEntry(repository);
  const createExpense = new CreateExpenseEntry(repository);

  const getTrialBalance = new GetTrialBalance(repository);
  const getIncomeStatement = new GetIncomeStatement(repository);
  const getJournal = new GetJournal(repository);

  const accountingStore = createAccountingStore({
    listAccounts,
    listEntries,
    getSummary,
    createIncome,
    createExpense,
    appDataBus: container.appDataBus,
  });

  const reportsStore = createReportsStore({
    getTrialBalance,
    getIncomeStatement,
    getJournal,
  });

  return {
    accountingStore,
    reportsStore,
  };
}
