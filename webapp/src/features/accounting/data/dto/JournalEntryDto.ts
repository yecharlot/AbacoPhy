export type JournalEntryDto = {
    id: string;
    date: string;
    description: string;
    debit_account: string;
    credit_account: string;
    amount: number;
    type: string;
};