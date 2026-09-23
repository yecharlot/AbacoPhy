import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {CommerceRepository} from "../../../../../features/commerce/domain/repositories/CommerceRepository";
import {UpdateOrderStatus} from "../../../../../features/commerce/domain/usecases";

describe('UpdateOrderStatus', () => {
    it('delega con estado permitido', async () => {
        const repo = mockOf<CommerceRepository>({ updateOrderStatus: vi.fn().mockResolvedValue(undefined) });
        await new UpdateOrderStatus(repo).execute('o1', 'confirmed');
        expect(repo.updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed');
    });

    it('rechaza id vacío', async () => {
        const repo = mockOf<CommerceRepository>({ updateOrderStatus: vi.fn() });
        await expect(new UpdateOrderStatus(repo).execute('', 'pending'))
            .rejects.toThrow('Pedido no válido');
    });

    it('rechaza estado fuera de ORDER_STATUSES', async () => {
        const repo = mockOf<CommerceRepository>({ updateOrderStatus: vi.fn() });
        await expect(new UpdateOrderStatus(repo).execute('o1', 'shipped' as never))
            .rejects.toThrow('Estado de pedido no permitido');
        expect(repo.updateOrderStatus).not.toHaveBeenCalled();
    });
});