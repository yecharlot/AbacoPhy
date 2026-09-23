import { describe, expect, it, vi } from 'vitest';
import type {AuditRepository} from "../../../../../features/audit/domain/repositories/AuditRepository";
import {ListSystemErrors} from "../../../../../features/audit/domain/usecases";
import {mockOf} from "../../../../helpers/mockOf";

describe('ListSystemErrors', () => {
    it('rechaza CID vacío o de solo espacios', async () => {
        const repo = mockOf<AuditRepository>({ getSystemErrors: vi.fn() });
        await expect(new ListSystemErrors(repo).execute()).rejects.toThrow('CID inválido');
    });
});