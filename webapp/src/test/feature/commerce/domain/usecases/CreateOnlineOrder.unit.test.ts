import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {CommerceRepository} from "../../../../../features/commerce/domain/repositories/CommerceRepository";
import type {OnlineOrder} from "../../../../../features/commerce/domain/entities/OnlineOrder";
import {CreateOnlineOrder} from "../../../../../features/commerce/domain/usecases";

const order: OnlineOrder = {
    id: 'o1', number: 'P-1', customer: 'Ana', phone: '', address: '',
    status: 'pending', lines: [], total: 100, currency: 'CUP', notes: '',
};

function makeRepo() {
    return mockOf<CommerceRepository>({ createOrder: vi.fn().mockResolvedValue(order) });
}

describe('CreateOnlineOrder', () => {
    it('recorta el cliente y delega', async () => {
        const repo = makeRepo();
        const input = { customer: '  Ana  ', lines: [{ productId: 'p1', qty: 1, unitPrice: 100 }] };
        await expect(new CreateOnlineOrder(repo).execute(input)).resolves.toEqual(order);
        expect(repo.createOrder).toHaveBeenCalledWith({ ...input, customer: 'Ana' });
    });

    it('rechaza cliente vacío', async () => {
        const repo = makeRepo();
        await expect(new CreateOnlineOrder(repo).execute({ customer: '  ', lines: [{ productId: 'p1', qty: 1 }] }))
            .rejects.toThrow('El nombre del cliente es obligatorio');
        expect(repo.createOrder).not.toHaveBeenCalled();
    });

    it('rechaza pedido sin líneas / línea sin producto / qty≤0 / precio negativo', async () => {
        const repo = makeRepo();
        await expect(new CreateOnlineOrder(repo).execute({ customer: 'Ana', lines: [] }))
            .rejects.toThrow('El pedido necesita al menos una línea');
        await expect(new CreateOnlineOrder(repo).execute({ customer: 'Ana', lines: [{ productId: '', qty: 1 }] }))
            .rejects.toThrow('Cada línea necesita un producto');
        await expect(new CreateOnlineOrder(repo).execute({ customer: 'Ana', lines: [{ productId: 'p1', qty: 0 }] }))
            .rejects.toThrow('La cantidad debe ser mayor que cero');
        await expect(new CreateOnlineOrder(repo).execute({ customer: 'Ana', lines: [{ productId: 'p1', qty: 1, unitPrice: -1 }] }))
            .rejects.toThrow('El precio no puede ser negativo');
    });
});