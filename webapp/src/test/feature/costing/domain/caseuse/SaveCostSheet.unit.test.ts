import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {CostingRepository} from "../../../../../features/costing/domain/repositories/CostingRepository";
import {SaveCostSheet} from "../../../../../features/costing/domain/usecases";

describe('SaveCostSheet', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CostingRepository>({ saveCostSheet: vi.fn().mockResolvedValue([]) });
        await expect(new SaveCostSheet(repo).execute(
            {
                productId: 'productId',
                period: 'period',
                materiaPrima: 12,
                materialesAuxiliares: 32,
                energia: 32,
                salarioDirecto: 324,
                otrosDirectos: 434,
                gastosIndirectos: 24,
                precioSugerido: 4324,
                currency: 'currencyTest',
                notes: 'notes screen'
            }
        )).resolves.toEqual([]);
    });
});