export type TransferLine = {
  productId: string;
  productCode: string;
  productName: string;
  qty: number;
  unitCost: number;
  amount: number;
};

export type Transfer = {
  id: string;
  number: string;
  date: string;
  unitId: string;
  unitName: string;
  lines: TransferLine[];
  status: string;
  note: string;
};

export type CreateTransferLineInput = {
  productId: string;
  qty: number;
};

export type CreateTransferInput = {
  unitId: string;
  date?: string;
  note?: string;
  lines: CreateTransferLineInput[];
};
