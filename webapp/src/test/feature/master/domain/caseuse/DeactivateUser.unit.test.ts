import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import {CreateUser, DeactivateUser} from "../../../../../features/master/domain/usecases";
import type {MasterRepository} from "../../../../../features/master/domain/repositories/MasterRepository";

describe('CreateUser', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<MasterRepository>({  deactivateUser: vi.fn().mockResolvedValue([]) });
        await expect(new DeactivateUser(repo).execute('idTest')).resolves.toEqual([]);
    });
});