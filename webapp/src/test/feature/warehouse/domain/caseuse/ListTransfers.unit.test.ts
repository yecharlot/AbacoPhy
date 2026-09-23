import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {WarehouseRepository} from "../../../../../features/warehouse/domain/repositories/WarehouseRepository";
import {ListTransfers} from "../../../../../features/warehouse/domain/usecases";

describe('ListTransfers', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<WarehouseRepository>({ getTransfer: vi.fn().mockResolvedValue() });
        await expect(new ListTransfers(repo).execute())
    });
});