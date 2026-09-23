import { setupServer } from 'msw/node';

/** Empty base. Integration tests register handlers with server.use(...). */
export const server = setupServer();
