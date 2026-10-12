export type BalanceSheetLine = {
  id: string;
  code: string;
  name: string;
  balance: number;
};

export type BalanceSheet = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
  equation?: Record<string, number>;
};

export type LedgerIntegrity = {
  ok: boolean;
  equationOk: boolean;
  equationDelta: number;
  entriesTotal: number;
  entriesUnbalanced: number;
  equation?: Record<string, number>;
};
