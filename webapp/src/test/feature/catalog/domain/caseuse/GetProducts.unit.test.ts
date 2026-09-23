import { describe, expect, it, vi } from 'vitest';
import { GetProducts } from '../../../../../features/catalog/domain/usecases';
import {mockOf} from "../../../../helpers/mockOf";
import type {CatalogRepository} from "../../../../../features/catalog/domain/repositories/CatalogRepository";

describe('GetProducts', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ getProducts: vi.fn().mockResolvedValue([]) });
        await expect(new GetProducts(repo).execute()).resolves.toEqual([]);
    });
});