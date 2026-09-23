import { describe, expect, it, vi } from 'vitest';
import {UpdateProduct} from '../../../../../features/catalog/domain/usecases';
import {mockOf} from "../../../../helpers/mockOf";
import type {CatalogRepository} from "../../../../../features/catalog/domain/repositories/CatalogRepository";

describe('UpdateProduct', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ getCurrencies: vi.fn().mockResolvedValue([]) });
        await expect(new UpdateProduct(repo).execute(
            {
                id: 'idTest',
                code: 'codeTest',
                name: 'nameTest',
                unit: 'unitTest',
                category: 'categoryTest',
                costStd: 323,
                priceSale: 233
            }
        )).resolves.toEqual([]);
    });
});