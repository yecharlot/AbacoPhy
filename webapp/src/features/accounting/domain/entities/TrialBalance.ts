export type TrialBalanceAccount = {
    accountId: string;
    accountName: string;
    accountCode: string;
    debit: number;
    credit: number;
    balance: number;
};

export type TrialBalance = {
    accounts: TrialBalanceAccount[];
    totalDebits: number;
    totalCredits: number;
    asOf: string;
};