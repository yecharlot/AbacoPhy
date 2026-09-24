import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { WarehouseRepository } from '../../../../../features/warehouse/domain/repositories/WarehouseRepository';
import type { Reception } from '../../../../../features/warehouse/domain/entities/Reception';
import { CreateReception } from '../../../../../features/warehouse/domain/usecases';

const reception: Reception = {
  id: 'r1',
  number: 'IR-1',
  date: '2026-09-21',
  supplier: 'Proveedor',
  docRef: 'F-1',
  lines: [],
  totalCost: 10,
  currency: 'CUP',
  status: 'posted',
  note: '',
};

describe('CreateReception', () => {
  it('delega con líneas válidas', async () => {
    const repo = mockOf<WarehouseRepository>({
      createReception: vi.fn().mockResolvedValue(reception),
    });
    const input = {
      supplier: 'Proveedor',
      lines: [{ productId: 'p1', qty: 2, unitCost: 5 }],
    };
    await expect(new CreateReception(repo).execute(input)).resolves.toEqual(reception);
    expect(repo.createReception).toHaveBeenCalledWith(input);
  });

  it('rechaza sin líneas', async () => {
    const repo = mockOf<WarehouseRepository>({ createReception: vi.fn() });
    await expect(
      new CreateReception(repo).execute({ supplier: 'X', lines: [] }),
    ).rejects.toThrow('La recepción necesita al menos una línea');
  });
});
