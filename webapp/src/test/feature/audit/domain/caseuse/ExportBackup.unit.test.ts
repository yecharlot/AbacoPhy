import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import { ExportBackup } from "../../../../../features/audit/domain/usecases";

describe('ExportBackup', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ restoreBackup: vi.fn() });
        await expect(new ExportBackup(repo).execute())
    });
});