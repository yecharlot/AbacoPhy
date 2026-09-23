import { describe, expect, it, vi } from 'vitest';
import {GetCurrencies } from '../../../../../features/catalog/domain/usecases';
import { mockOf } from '../../../helpers/mockOf';
import type {CatalogRepository} from "../../../../../features/catalog/domain/repositories/CatalogRepository";

describe('GetCurrencies', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ getCurrencies: vi.fn().mockResolvedValue([]) });
        await expect(new GetCurrencies(repo).execute()).resolves.toEqual([]);
    });
});