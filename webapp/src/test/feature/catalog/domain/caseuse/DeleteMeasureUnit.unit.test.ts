import { describe, expect, it, vi } from 'vitest';
import {CreateMeasureUnit, DeleteMeasureUnit, GetProducts} from '../../../../../features/catalog/domain/usecases';
import {mockOf} from "../../../../helpers/mockOf";
import type { CatalogRepository } from "../../../../../features/catalog/domain/repositories/CatalogRepository";

describe('CreateMeasureUnit', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<CatalogRepository>({  deleteMeasureUnit: vi.fn().mockResolvedValue([]) });
        await expect(new DeleteMeasureUnit(repo).execute('323')).resolves.toEqual([]);
    });
});