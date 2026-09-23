import { describe, expect, it, vi } from 'vitest';
import {UpdateUser} from "../../../../../features/master/domain/usecases";
import type {MasterRepository} from "../../../../../features/master/domain/repositories/MasterRepository";

describe('UpdateUser', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<MasterRepository>({ updateUser: vi.fn().mockResolvedValue([]) });
        await expect(new UpdateUser(repo).execute(
            {
                id: 'idtest',
                displayName: 'nameTest',
                role: 'roleTest',
                password: 'passTest',
                active: true,
                modules: {}
            }
        )).resolves.toEqual([]);
    });
});