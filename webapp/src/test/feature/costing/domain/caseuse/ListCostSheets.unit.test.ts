import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {CostingRepository} from "../../../../../features/costing/domain/repositories/CostingRepository";
import {ListCostSheets} from "../../../../../features/costing/domain/usecases";

describe('ListCostSheets', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CostingRepository>({ getCostSheets: vi.fn().mockResolvedValue([]) });
        await expect(new ListCostSheets(repo).execute()).resolves.toEqual([]);
    });
});