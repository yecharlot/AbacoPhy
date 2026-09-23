import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {CostingRepository} from "../../../../../features/costing/domain/repositories/CostingRepository";
import {SavePriceSheet} from "../../../../../features/costing/domain/usecases";

describe('SaveCostSheet', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CostingRepository>({ getPriceSheets: vi.fn().mockResolvedValue([]) });
        await expect(new SavePriceSheet(repo).execute(
            {
                productId: 'productIdTest',
                costRef: 232,
                marginPct: 3232,
                price: 42,
                currency: 'CurrencyTest',
                notes: 'noteTest'
            }
        )).resolves.toEqual([]);
    });
});