import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {CatalogRepository} from "../../../../../features/catalog/domain/repositories/CatalogRepository";
import {ListUsers} from "../../../../../features/master/domain/usecases";

describe('ListUsers', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ getUsers: vi.fn().mockResolvedValue([]) });
        await expect(new ListUsers(repo).execute()).resolves.toEqual([]);
    });
});