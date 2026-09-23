import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {WarehouseRepository} from "../../../../../features/warehouse/domain/repositories/WarehouseRepository";
import {CreateReception} from "../../../../../features/warehouse/domain/usecases";

describe('CreateReception', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<WarehouseRepository>({ createReception: vi.fn().mockResolvedValue() });
        await expect(new CreateReception(repo).execute(
            {
                supplier: 'supplier',
                docRef: 'docRef',
                date: 'dateTest',
                note: 'note Test',
                lines: []
            }
        ))
    });
});