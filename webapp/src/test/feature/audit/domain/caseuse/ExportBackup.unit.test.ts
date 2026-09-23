import { describe, expect, it, vi } from 'vitest';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import { ExportBackup } from "../../../../../features/audit/domain/usecases";
import {mockOf} from "../../../../helpers/mockOf";

describe('ExportBackup', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ restoreBackup: vi.fn() });
        await expect(new ExportBackup(repo).execute()).rejects.toThrow('CID inválido');
    });
});