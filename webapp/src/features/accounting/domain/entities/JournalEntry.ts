export type JournalEntry = {
    id: string;
    date: string;
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
};