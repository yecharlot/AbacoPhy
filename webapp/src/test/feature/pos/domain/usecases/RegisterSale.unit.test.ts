import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { SalesRepository } from '../../../../../features/pos/domain/repositories/SalesRepository';
import type { Sale } from '../../../../../features/pos/domain/entities/Sale';
import { RegisterSale } from '../../../../../features/pos/domain/usecases';

const sale: Sale = {
  id: 's1',
  number: 'V-1',
  date: '2026-09-21',
  unitId: 'u1',
  unitName: 'Caja 1',
  seller: 'Ana',
  lines: [],
  subtotal: 100,
  discount: 0,
  total: 100,
  costTotal: 40,
  currency: 'CUP',
  status: 'closed',
  note: '',
};

function makeRepo() {
  return mockOf<SalesRepository>({
    createSale: vi.fn().mockResolvedValue(sale),
  });
}

describe('RegisterSale', () => {
  it('delega en createSale con líneas válidas', async () => {
    const repo = makeRepo();
    const input = {
      unitId: 'u1',
      seller: 'Ana',
      lines: [{ productId: 'p1', qty: 2, unitPrice: 50 }],
    };
    await expect(new RegisterSale(repo).execute(input)).resolves.toEqual(sale);
    expect(repo.createSale).toHaveBeenCalledWith(input);
  });

  it('rechaza venta sin líneas', async () => {
    const repo = makeRepo();
    await expect(
      new RegisterSale(repo).execute({ unitId: 'u1', lines: [] }),
    ).rejects.toThrow('La venta necesita al menos una línea');
    expect(repo.createSale).not.toHaveBeenCalled();
  });

  it('rechaza qty ≤ 0', async () => {
    const repo = makeRepo();
    await expect(
      new RegisterSale(repo).execute({ lines: [{ productId: 'p1', qty: 0 }] }),
    ).rejects.toThrow('La cantidad debe ser mayor que cero');
  });
});
