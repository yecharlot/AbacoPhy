import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {WarehouseRepository} from "../../../../../features/warehouse/domain/repositories/WarehouseRepository";
import {GetSalesUnits} from "../../../../../features/warehouse/domain/usecases";

describe('GetSalesUnits', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<WarehouseRepository>({ createSalesUnit: vi.fn().mockResolvedValue() });
        await expect(new GetSalesUnits(repo).execute())
    });
});