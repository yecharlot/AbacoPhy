import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {WarehouseRepository} from "../../../../../features/warehouse/domain/repositories/WarehouseRepository";
import {CreateTransfer} from "../../../../../features/warehouse/domain/usecases";

describe('CreateTransfer', () => {
    it('delega en el repositorio', async () => {
        const repo = mockOf<WarehouseRepository>({ createTransfer: vi.fn().mockResolvedValue() });
        await expect(new CreateTransfer(repo).execute(
            {
                unitId: 'supplier',
                date: 'dateTest',
                note: 'note Test',
                lines: []
            }
        ))
    });
});