import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import {GetModules} from "../../../../../features/master/domain/usecases";
import type {MasterRepository} from "../../../../../features/master/domain/repositories/MasterRepository";

describe('GetModules', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<MasterRepository>({  getModules: vi.fn().mockResolvedValue([]) });
        await expect(new GetModules(repo).execute()).resolves.toEqual([]);
    });
});