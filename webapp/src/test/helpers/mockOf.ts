/**
 * Partial typed mock for domain repository contracts.
 * Usage: mockOf<AuditRepository>({ createBackup: vi.fn().mockResolvedValue(...) })
 */
export function mockOf<T extends object>(partial: Partial<T> = {}): T {
  return partial as T;
}
