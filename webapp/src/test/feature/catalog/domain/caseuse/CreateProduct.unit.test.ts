import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {CatalogRepository} from "../../../../../features/catalog/domain/repositories/CatalogRepository";
import {CreateProduct} from "../../../../../features/catalog/domain/usecases";

describe('CreateProduct', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ createProduct: vi.fn().mockResolvedValue([]) });
        await expect(new CreateProduct(repo).execute(
            {
                code: 'codeTest',
                name: 'nameTest',
                unit: 'unitTest',
                category: 'categoryTest',
                costStd: 32,
                priceSale: 1
            }
        )).resolves.toEqual([]);
    });
});