import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import {ListAuditTrail } from "../../../../../features/audit/domain/usecases";

describe('ListAuditTrail', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ getBackups: vi.fn() });
        await expect(new ListAuditTrail(repo).execute())
    });
});