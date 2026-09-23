import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {CostingRepository} from "../../../../../features/costing/domain/repositories/CostingRepository";
import {ListCostSheets, ListPriceSheets} from "../../../../../features/costing/domain/usecases";

describe('ListCostSheets', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CostingRepository>({ savePriceSheet: vi.fn().mockResolvedValue([]) });
        await expect(new ListPriceSheets(repo).execute()).resolves.toEqual([]);
    });
});