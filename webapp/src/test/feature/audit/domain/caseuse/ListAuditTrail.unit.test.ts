import { describe, expect, it, vi } from 'vitest';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import {ListAuditTrail } from "../../../../../features/audit/domain/usecases";
import {mockOf} from "../../../../helpers/mockOf";

describe('ListAuditTrail', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ getBackups: vi.fn() });
        await expect(new ListAuditTrail(repo).execute()).rejects.toThrow('CID inválido');
    });
});