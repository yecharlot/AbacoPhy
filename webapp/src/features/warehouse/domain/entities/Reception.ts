export type ReceptionLine = {
  productId: string;
  productCode: string;
  productName: string;
  qty: number;
  unitCost: number;
  amount: number;
};

export type Reception = {
  id: string;
  number: string;
  date: string;
  supplier: string;
  docRef: string;
  lines: ReceptionLine[];
  totalCost: number;
  currency: string;
  status: string;
  note: string;
};

export type CreateReceptionLineInput = {
  productId: string;
  qty: number;
  unitCost: number;
};

export type CreateReceptionInput = {
  supplier?: string;
  docRef?: string;
  date?: string;
  note?: string;
  lines: CreateReceptionLineInput[];
};
