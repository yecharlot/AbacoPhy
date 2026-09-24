import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup/vitest.setup.ts'],
    exclude: ['node_modules', 'dist'],
    // Single workspace is simpler until integration/UI suites grow.
    // Keep name filters via file suffix: *.unit.test.ts | *.integration.test.ts | *.ui.test.ts
    include: ['src/**/*.{unit,integration,ui}.test.ts'],
  },
})
