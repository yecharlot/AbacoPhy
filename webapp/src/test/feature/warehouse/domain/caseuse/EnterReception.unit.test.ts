import { describe, it, expect, vi } from 'vitest';
import { EnterReception } from '../../../../../features/warehouse/domain/usecases/EnterReception';
import type { WarehouseRepository } from '../../../../../features/warehouse/domain/repositories/WarehouseRepository';
import type { Reception } from '../../../../../features/warehouse/domain/entities/Reception';
import { mockOf } from '../../../../helpers/mockOf';

const reception: Reception = {
  id: 'r1',
  number: 'IR-0001',
  date: '2026-09-25',
  hasInvoice: true,
  invoiceRef: 'F-1',
  supplier: 'Alibaba',
  receiver: 'Daniel',
  docRef: 'F-1',
  lines: [],
  totalCost: 3600,
  currency: 'CUP',
  status: 'entrado',
  note: '',
};

describe('EnterReception', () => {
  it('delega en el repositorio con accept true', async () => {
    const repo = mockOf<WarehouseRepository>({
      enterReception: vi.fn().mockResolvedValue(reception),
    });
    await expect(
      new EnterReception(repo).execute({ id: 'r1', accept: true }),
    ).resolves.toEqual(reception);
    expect(repo.enterReception).toHaveBeenCalledWith({ id: 'r1', accept: true, note: undefined });
  });

  it('rechaza id vacío', async () => {
    const repo = mockOf<WarehouseRepository>({ enterReception: vi.fn() });
    await expect(new EnterReception(repo).execute({ id: '  ', accept: true })).rejects.toThrow(
      /informe/i,
    );
  });

  it('rechaza accept false', async () => {
    const repo = mockOf<WarehouseRepository>({ enterReception: vi.fn() });
    await expect(new EnterReception(repo).execute({ id: 'r1', accept: false })).rejects.toThrow(
      /accept/i,
    );
  });
});
