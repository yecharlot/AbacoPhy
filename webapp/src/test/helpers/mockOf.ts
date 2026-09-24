/** Partial typed mock for domain repository contracts. */
export function mockOf<T extends object>(partial: Partial<T> = {}): T {
  return partial as T;
}
