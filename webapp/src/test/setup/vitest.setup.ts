import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/svelte";
import { server } from "./msw.server";

beforeAll(() => {
    const appwriteOrigin = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "") ?? "";
    server.listen({
        onUnhandledRequest(request, print) {
            // Live Appwrite calls must not be treated as missing MSW handlers.
            if (appwriteOrigin && request.url.startsWith(appwriteOrigin)) return;
            print.error();
        },
    });
});

afterEach(() => {
    cleanup();
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});