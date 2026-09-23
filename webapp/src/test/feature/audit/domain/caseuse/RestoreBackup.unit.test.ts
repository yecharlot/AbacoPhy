import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import {RestoreBackup} from "../../../../../features/audit/domain/usecases";

describe('RestoreBackup', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ restoreBackup: vi.fn() });
        await expect(new RestoreBackup(repo).execute('   '))
            .rejects.toThrow('Indique el CID de la salva a restaurar');
        expect(repo.restoreBackup).not.toHaveBeenCalled();
    });

    it('recorta el CID y delega', async () => {
        const repo = mockOf<AuditRepository>({ restoreBackup: vi.fn().mockResolvedValue(undefined) });
        await new RestoreBackup(repo).execute('  cid-1  ');
        expect(repo.restoreBackup).toHaveBeenCalledWith('cid-1');
    });
});