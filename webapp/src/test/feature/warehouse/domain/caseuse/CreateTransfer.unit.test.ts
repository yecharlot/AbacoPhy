import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../../helpers/mockOf';
import type { WarehouseRepository } from '../../../../../features/warehouse/domain/repositories/WarehouseRepository';
import type { Transfer } from '../../../../../features/warehouse/domain/entities/Transfer';
import { CreateTransfer } from '../../../../../features/warehouse/domain/usecases';

const transfer = {
  id: 't1',
  number: 'TR-1',
  date: '2026-09-21',
  unitId: 'u1',
  unitName: 'Caja',
  lines: [],
  totalCost: 0,
  currency: 'CUP',
  status: 'posted',
  note: '',
} as Transfer;

describe('CreateTransfer', () => {
  it('delega con unidad y líneas válidas', async () => {
    const repo = mockOf<WarehouseRepository>({
      createTransfer: vi.fn().mockResolvedValue(transfer),
    });
    const input = {
      unitId: 'u1',
      lines: [{ productId: 'p1', qty: 1 }],
    };
    await expect(new CreateTransfer(repo).execute(input)).resolves.toEqual(transfer);
    expect(repo.createTransfer).toHaveBeenCalledWith(input);
  });

  it('rechaza sin unitId', async () => {
    const repo = mockOf<WarehouseRepository>({ createTransfer: vi.fn() });
    await expect(
      new CreateTransfer(repo).execute({ unitId: '', lines: [{ productId: 'p1', qty: 1 }] }),
    ).rejects.toThrow('Seleccione la unidad de venta destino');
  });
});
