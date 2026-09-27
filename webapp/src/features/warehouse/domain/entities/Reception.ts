export type ReceptionLine = {
  productId: string;
  productCode: string;
  productName: string;
  unit?: string;
  qty: number;
  /** Costo unitario registrado en esta recepción (entrada a promedio ponderado). */
  unitCost: number;
  amount: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateReceptionLineInput = {
  productId: string;
  qty: number;
  /**
   * Costo unitario de ESTA recepción.
   * Alimenta el costo promedio ponderado del producto (solo vía recepciones).
   * @see webapp/.policies/warehouse-recepcion-costo-promedio.md
   */
  unitCost: number;
  unit?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type EnterReceptionInput = {
  id: string;
  /** Indica si se valida con el económico. El caso de uso lanza error si es false. */
  accept: boolean;
  note?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;
};
