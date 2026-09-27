export type TransferLine = {
  productId: string;
  productCode: string;
  productName: string;
  qty: number;
  unitCost: number;
  amount: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateTransferLineInput = {
  productId: string;
  qty: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateTransferInput = {
  unitId: string;
  date?: string;
  note?: string;
  lines: CreateTransferLineInput[];
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
