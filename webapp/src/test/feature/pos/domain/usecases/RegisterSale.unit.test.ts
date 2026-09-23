import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {SalesRepository} from "../../../../../features/pos/domain/repositories/SalesRepository";
import { RegisterSale} from "../../../../../features/pos/domain/usecases";

describe('RegisterSale', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<SalesRepository>({ registerSales: vi.fn().mockResolvedValue([]) });
        await expect(new RegisterSale(repo).execute(
            {
                unitId: 'idTest',
                seller: 'sellertest',
                date: 'date test',
                note: 'notetest',
                lines: []
            }
        )).resolves.toEqual([]);
    });
});