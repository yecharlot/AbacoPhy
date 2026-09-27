import { describe, expect, it } from 'vitest';
import { receptionsSeries } from '../../../../../features/warehouse/ui/viewmodels/warehouseCharts';
import type { Reception } from '../../../../../features/warehouse/domain/entities/Reception';

const base: Omit<Reception, 'id' | 'date' | 'totalCost' | 'status' | 'metadataState'> = {
    number: 'IR', hasInvoice: false, supplier: '', receiver: 'Almacén', docRef: '', lines: [], currency: 'CUP', note: '',
};

describe('receptionsSeries', () => {
    it('only includes receptions physically confirmed in warehouse', () => {
        const rows: Reception[] = [
            { ...base, id: 'pending', date: '2026-09-25', totalCost: 10, status: 'pendiente_entrada' },
            { ...base, id: 'problem', date: '2026-09-25', totalCost: 20, status: 'problemas_entrada' },
            { ...base, id: 'confirmed', date: '2026-09-25', totalCost: 30, status: 'entrado' },
        ];

        expect(receptionsSeries(rows)).toEqual([{ label: '09-25', value: 30, hint: '2026-09-25' }]);
    });
});