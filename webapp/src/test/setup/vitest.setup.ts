import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { server } from './msw.server';

/**
 * ÁbacoPhy talks to its own Go API (mocked with MSW in integration tests).
 * No Appwrite / third-party passthrough.
 */
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
