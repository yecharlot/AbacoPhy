import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import { ListBackups} from "../../../../../features/audit/domain/usecases";

describe('ListBackups', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ getTrail: vi.fn() });
        await expect(new ListBackups(repo).execute())
    });
});