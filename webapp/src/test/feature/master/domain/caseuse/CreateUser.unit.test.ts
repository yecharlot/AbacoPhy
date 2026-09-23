import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import {CreateUser} from "../../../../../features/master/domain/usecases";
import type {MasterRepository} from "../../../../../features/master/domain/repositories/MasterRepository";

describe('CreateUser', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<MasterRepository>({  createUser: vi.fn().mockResolvedValue([]) });
        await expect(new CreateUser(repo).execute(
            {
                username: 'usernameTest',
                displayName: 'displayNameTest',
                password: 'password',
                role: 'roleTest'
            }
        )).resolves.toEqual([]);
    });
});