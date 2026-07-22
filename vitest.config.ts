import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(here, 'src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    reporters: ['default'],
    server: {
      // Inline EVERY dependency: in node env vitest externalizes node_modules
      // (native require bypasses vi.mock), so a library's internal
      // `require("react-native")` resolves to the real unparseable Flow
      // package. Inlining routes all requires through vite's loader, where the
      // react-native mock in setup.ts applies.
      deps: { inline: [/.+/] },
    },
  },
});
