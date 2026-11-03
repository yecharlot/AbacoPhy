import { describe, expect, it, vi } from 'vitest';
import {mockOf} from "../../../../helpers/mockOf";
import type {MasterRepository} from "../../../../../features/master/domain/repositories/MasterRepository";
import {CreateTenant} from "../../../../../features/master/domain/usecases";

describe('CreateTenant', () => {
    it('recorta el nombre y delega', async () => {
        const tenant = { id: 't2', slug: 's', name: 'Bar El Patio', currency: 'CUP', active: true, createdAt: '2026-09-21' };
        const repo = mockOf<MasterRepository>({ createTenant: vi.fn().mockResolvedValue(tenant) });
        await expect(new CreateTenant(repo).execute({ name: '  Bar El Patio  ' })).resolves.toEqual(tenant);
        expect(repo.createTenant).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bar El Patio' }));
    });

    it('rechaza nombre vacío', async () => {
        const repo = mockOf<MasterRepository>({ createTenant: vi.fn() });
        await expect(new CreateTenant(repo).execute({ name: '  ' }))
            .rejects.toThrow('El nombre del negocio es obligatorio');
    });

    it('crea el negocio sin recibir una contraseña administrativa del cliente', async () => {
        const tenant = { id: 't3', slug: 'x', name: 'X', currency: 'CUP', active: true, createdAt: '2026-11-03' };
        const repo = mockOf<MasterRepository>({ createTenant: vi.fn().mockResolvedValue(tenant) });
        await expect(new CreateTenant(repo).execute({ name: 'X' })).resolves.toEqual(tenant);
        expect(repo.createTenant).toHaveBeenCalledWith({ name: 'X' });
    });
});