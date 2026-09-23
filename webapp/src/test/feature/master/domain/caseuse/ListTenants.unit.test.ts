import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {CatalogRepository} from "../../../../../features/catalog/domain/repositories/CatalogRepository";
import {ListTenants} from "../../../../../features/master/domain/usecases";

describe('ListTenants', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ getTenants: vi.fn().mockResolvedValue([]) });
        await expect(new ListTenants(repo).execute()).resolves.toEqual([]);
    });
});