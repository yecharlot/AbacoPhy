import { describe, expect, it, vi } from 'vitest';
import {CreateMeasureUnit, GetProducts} from '../../../../../features/catalog/domain/usecases';
import {mockOf} from "../../../../helpers/mockOf";
import type { CatalogRepository } from "../../../../../features/catalog/domain/repositories/CatalogRepository";

describe('CreateMeasureUnit', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({ createMeasureUnit: vi.fn().mockResolvedValue([]) });
        await expect(new CreateMeasureUnit(repo).execute({name:'Refresco',code:'u',symbol:'kg'})).resolves.toEqual([]);
    });
});