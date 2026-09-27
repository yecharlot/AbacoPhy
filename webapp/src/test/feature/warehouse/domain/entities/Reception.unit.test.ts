import { describe, expect, it } from 'vitest';
import {
    getReceptionVisualStatus,
    type Reception,
} from '../../../../../features/warehouse/domain/entities/Reception';

function reception(status: Reception['status'], metadataState?: Reception['metadataState']): Reception {
    return {
        id: 'ir-1',
        number: 'IR-0001',
        date: '2026-09-27',
        hasInvoice: true,
        supplier: 'Proveedor',
        receiver: 'Almacén',
        docRef: 'F-1',
        lines: [],
        totalCost: 10,
        currency: 'CUP',
        status,
        note: '',
        metadataState,
    };
}

describe('getReceptionVisualStatus', () => {
    it.each([
        ['pendiente_entrada', undefined, 'pending_entry'],
        ['entrado', undefined, 'entry_confirmed'],
        ['problemas_entrada', undefined, 'entry_problem'],
        ['anulado', undefined, 'cancelled'],
    ] as const)('maps the legacy status %s', (status, metadataState, expected) => {
        expect(getReceptionVisualStatus(reception(status, metadataState))).toBe(expected);
    });

    it('uses recognized metadata as the canonical state', () => {
        expect(
            getReceptionVisualStatus(
                reception('pendiente_entrada', { receptionStatus: 'entry_confirmed' }),
            ),
        ).toBe('entry_confirmed');
    });
});