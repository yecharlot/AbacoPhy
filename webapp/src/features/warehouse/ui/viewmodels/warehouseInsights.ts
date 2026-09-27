/**
 * Agregaciones exclusivamente de presentación para el tablero de almacén.
 * No altera existencias, costos ni estados operativos: esos datos son
 * autoritativos en el backend.
 */
import type { Transfer } from '../../domain/entities/Transfer';
import type { WarehouseStockRow } from '../../domain/entities/Stock';

export type StockHealth = 'available' | 'low' | 'out';

export type WarehouseInsight = {
    totalValue: number;
    activeProducts: number;
    lowProducts: number;
    outProducts: number;
    lowThreshold: number;
};

export type TransferDemand = {
    productId: string;
    productCode: string;
    productName: string;
    qty: number;
    amount: number;
    transfers: number;
};

/** Umbral operativo relativo mientras el API no exponga mínimos por producto. */
export function lowStockThreshold(rows: WarehouseStockRow[]): number {
    const maximum = Math.max(0, ...rows.map((row) => Number(row.qty) || 0));
    return Math.max(5, Math.ceil(maximum * 0.1));
}

export function stockHealth(qty: number, threshold: number): StockHealth {
    if (qty <= 0) return 'out';
    if (qty <= threshold) return 'low';
    return 'available';
}

export function warehouseInsight(rows: WarehouseStockRow[]): WarehouseInsight {
    const lowThreshold = lowStockThreshold(rows);
    let lowProducts = 0;
    let outProducts = 0;
    for (const row of rows) {
        const health = stockHealth(row.qty, lowThreshold);
        if (health === 'out') outProducts += 1;
        if (health === 'low') lowProducts += 1;
    }
    return {
        totalValue: rows.reduce((total, row) => total + row.amountBase, 0),
        activeProducts: rows.filter((row) => row.qty > 0).length,
        lowProducts,
        outProducts,
        lowThreshold,
    };
}

/** Demanda observada: salidas documentadas del almacén central a puntos de venta. */
export function transferDemand(transfers: Transfer[], limit = 5): TransferDemand[] {
    const demand = new Map<string, TransferDemand>();
    for (const transfer of transfers) {
        for (const line of transfer.lines) {
            const current = demand.get(line.productId) ?? {
                productId: line.productId,
                productCode: line.productCode,
                productName: line.productName,
                qty: 0,
                amount: 0,
                transfers: 0,
            };
            current.qty += line.qty;
            current.amount += line.amount;
            current.transfers += 1;
            demand.set(line.productId, current);
        }
    }
    return [...demand.values()]
        .sort((first, second) => second.qty - first.qty || second.transfers - first.transfers)
        .slice(0, limit);
}