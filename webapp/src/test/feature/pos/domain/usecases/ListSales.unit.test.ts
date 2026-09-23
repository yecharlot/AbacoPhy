import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {SalesRepository} from "../../../../../features/pos/domain/repositories/SalesRepository";
import {ListSales} from "../../../../../features/pos/domain/usecases";

describe('ListSales', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<SalesRepository>({ getSales: vi.fn().mockResolvedValue([]) });
        await expect(new ListSales(repo).execute()).resolves.toEqual([]);
    });
});