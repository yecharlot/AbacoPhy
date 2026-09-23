import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup/vitest.setup.ts"],
    exclude: ["node_modules", "dist"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.unit.test.ts"],
        }
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
        }
      },
      {
        extends: true,
        test: {
          name: "ui",
          include: ["src/**/*.ui.test.ts"]
        }
      }
    ]
  }
})
