import type { WarehouseSnapshot } from '../entities/Stock';
import type { CreateSalesUnitInput, SalesUnit, SalesUnitsSnapshot } from '../entities/SalesUnit';
import type {
  CreateReceptionInput,
  EnterReceptionInput,
  Reception,
} from '../entities/Reception';
import type { CreateTransferInput, Transfer } from '../entities/Transfer';
import type { AdjustStockInput, KardexSnapshot, StockDiscrepancy } from '../entities/Kardex';

/**
 * Contrato de dominio. Otras features (pos) dependen de esta interfaz,
 * nunca de la capa data de warehouse.
 */
export interface WarehouseRepository {
  getStock(): Promise<WarehouseSnapshot>;
  getSalesUnits(): Promise<SalesUnitsSnapshot>;
  createSalesUnit(input: CreateSalesUnitInput): Promise<SalesUnit>;
  getReceptions(): Promise<Reception[]>;
  createReception(input: CreateReceptionInput): Promise<Reception>;
  /** Almacenero/admin: confirma entrada física o registra un problema sin mover stock. */
  enterReception(input: EnterReceptionInput): Promise<Reception>;
  getTransfers(): Promise<Transfer[]>;
  createTransfer(input: CreateTransferInput): Promise<Transfer>;
  getKardex(params: {
    productId?: string;
    location?: string;
    unitId?: string;
  }): Promise<KardexSnapshot>;
  adjustStock(input: AdjustStockInput): Promise<{ storedQty: number; ledgerQty: number }>;
  reconcileStock(): Promise<StockDiscrepancy[]>;
}

