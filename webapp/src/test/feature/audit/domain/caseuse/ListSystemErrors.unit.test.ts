import { describe, expect, it, vi } from 'vitest';
import { mockOf } from '../../../helpers/mockOf';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import {ListSystemErrors} from "../../../../../features/audit/domain/usecases";

describe('ListSystemErrors', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ getSystemErrors: vi.fn() });
        await expect(new ListSystemErrors(repo).execute())
    });
});