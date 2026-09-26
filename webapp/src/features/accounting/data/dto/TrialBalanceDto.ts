export type TrialBalanceAccountDto = {
    account_id: string;
    account_name: string;
    account_code: string;
    debit: number;
    credit: number;
    balance: number;
};

export type TrialBalanceDto = {
    accounts: TrialBalanceAccountDto[];
    total_debits: number;
    total_credits: number;
    as_of: string;
};