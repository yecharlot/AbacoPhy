import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {CostingRepository} from "../../../../../features/costing/domain/repositories/CostingRepository";
import {DeletePriceSheet} from "../../../../../features/costing/domain/usecases";

describe('DeletePriceSheet', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CostingRepository>({ deletePriceSheet: vi.fn().mockResolvedValue([]) });
        await expect(new DeletePriceSheet(repo).execute('idTest')).resolves.toEqual([]);
    });
});