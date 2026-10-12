/** Movimiento del libro de existencias (backend StockLedger). */
export type StockMovement = {
  id: string;
  productId: string;
  location: 'warehouse' | 'unit' | string;
  unitId?: string;
  kind: string;
  qty: number;
  qtySigned: number;
  unitCost: number;
  amountBase: number;
  balanceAfter: number;
  refType?: string;
  refId?: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
};

export type KardexSnapshot = {
  movements: StockMovement[];
  storedQty: number;
  ledgerQty: number;
  productId: string;
  location: string;
  unitId?: string;
};

export type StockDiscrepancy = {
  productId: string;
  productCode: string;
  productName: string;
  location: string;
  unitId?: string;
  storedQty: number;
  ledgerQty: number;
  delta: number;
};

export type AdjustStockInput = {
  productId: string;
  location: 'warehouse' | 'unit';
  unitId?: string;
  deltaQty: number;
  unitCost?: number;
  note: string;
};

export function movementKindLabel(kind: string): string {
  switch (kind) {
    case 'reception_in':
      return 'Entrada recepción';
    case 'transfer_out':
      return 'Salida transferencia';
    case 'transfer_in':
      return 'Entrada transferencia';
    case 'sale_out':
      return 'Salida venta';
    case 'adjust_in':
      return 'Ajuste (+)';
    case 'adjust_out':
      return 'Ajuste (−)';
    default:
      return kind || '—';
  }
}
