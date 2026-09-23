import { setupServer } from "msw/node";

// Base vacía.
// Cada prueba de integración puede registrar handlers con `server.use(...)`.
export const server = setupServer();
