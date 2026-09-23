import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import { UpdateModules} from "../../../../../features/master/domain/usecases";
import type {MasterRepository} from "../../../../../features/master/domain/repositories/MasterRepository";

describe('UpdateModules', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<MasterRepository>({ updateModules: vi.fn().mockResolvedValue([]) });
        await expect(new UpdateModules(repo).execute(
            {}
        )).resolves.toEqual([]);
    });
});