import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {WarehouseRepository} from "../../../../../features/warehouse/domain/repositories/WarehouseRepository";
import {CreateSalesUnit} from "../../../../../features/warehouse/domain/usecases";

describe('CreateSalesUnit', () => {
    it('recorta el nombre y delega', async () => {
        const unit = { id: 'uv1', code: 'UV-1', name: 'Caja 1', address: '', phone: '', active: true };
        const repo = mockOf<WarehouseRepository>({ createSalesUnit: vi.fn().mockResolvedValue(unit) });
        await expect(new CreateSalesUnit(repo).execute({ name: '  Caja 1  ' })).resolves.toEqual(unit);
        expect(repo.createSalesUnit).toHaveBeenCalledWith({ name: 'Caja 1' });
    });

    it('rechaza nombre vacío', async () => {
        const repo = mockOf<WarehouseRepository>({ createSalesUnit: vi.fn() });
        await expect(new CreateSalesUnit(repo).execute({ name: '   ' }))
            .rejects.toThrow('El nombre de la unidad es obligatorio');
        expect(repo.createSalesUnit).not.toHaveBeenCalled();
    });
});