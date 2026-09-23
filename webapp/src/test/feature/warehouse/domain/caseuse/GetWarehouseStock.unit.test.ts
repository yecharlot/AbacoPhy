import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {WarehouseRepository} from "../../../../../features/warehouse/domain/repositories/WarehouseRepository";
import { GetWarehouseStock} from "../../../../../features/warehouse/domain/usecases";

describe('GetWarehouseStock', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<WarehouseRepository>({ getStock: vi.fn().mockResolvedValue() });
        await expect(new GetWarehouseStock(repo).execute())
    });
});