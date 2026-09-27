export type ReceptionLine = {
  productId: string;
  productCode: string;
  productName: string;
  unit?: string;
  qty: number;
  /** Costo unitario documental registrado en esta recepción. Solo entra al promedio al confirmar en Almacén. */
  unitCost: number;
  amount: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type ReceptionStatus = 'pendiente_entrada' | 'entrado' | 'problemas_entrada' | 'anulado' | string;

export type ReceptionVisualStatus = 'pending_entry' | 'entry_confirmed' | 'entry_problem';

export type ReceptionMetadata = {
  receptionStatus?: ReceptionVisualStatus;
  problemReason?: string;
  entryActor?: string;
  entryAt?: string;
};

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
  metadataState?: ReceptionMetadata;

};

export type CreateReceptionLineInput = {
  productId: string;
  qty: number;
  /**
   * Costo unitario de ESTA recepción.
   * Costo documental de esta compra. Solo pasa a inventario cuando almacén confirma la entrada.
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
  /** true = entrada física confirmada; false = registrar problema de entrada. */
  accept: boolean;
  note?: string;
  reason?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;
};
