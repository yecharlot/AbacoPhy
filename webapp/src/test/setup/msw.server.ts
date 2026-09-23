import { setupServer } from 'msw/node';

/**
 * Empty base server.
 * Integration tests register handlers with `server.use(...)`.
 * Unit tests of domain use cases do not need network handlers.
 */
export const server = setupServer();
