export type ReceptionLine = {
  productId: string;
  productCode: string;
  productName: string;
  unit?: string;
  qty: number;
  unitCost: number;
  amount: number;
};

/** pendiente_entrada = económico registró; entrado = almacenero dio entrada física */
export type ReceptionStatus = 'pendiente_entrada' | 'entrado' | 'anulado' | string;

export type Reception = {
  id: string;
  number: string;
  date: string;
  hasInvoice: boolean;
  invoiceRef?: string;
  supplier: string;
  receiver: string;
  docRef: string;
  lines: ReceptionLine[];
  totalCost: number;
  currency: string;
  status: ReceptionStatus;
  note: string;
  enteredBy?: string;
  enteredAt?: string;
};

export type CreateReceptionLineInput = {
  productId: string;
  qty: number;
  unitCost: number;
  unit?: string;
};

export type CreateReceptionInput = {
  /** true = compra con factura (proveedor y nº factura obligatorios) */
  hasInvoice: boolean;
  invoiceRef?: string;
  supplier?: string;
  /** Quién recibe la mercancía (obligatorio) */
  receiver: string;
  docRef?: string;
  date?: string;
  note?: string;
  lines: CreateReceptionLineInput[];
};

export type EnterReceptionInput = {
  id: string;
  /** Debe ser true en runtime: validado con el económico (EnterReception lo exige). */
  accept: boolean;
  note?: string;
};
