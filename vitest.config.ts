import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import JSON5 from 'json5';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Vite plugin: parse .json5 files into ES modules so
 * `import x from './f.json5'` yields the parsed object.
 *
 * Mirrors the Metro transformer at scripts/json5-transformer.js so the same
 * registry imports work under both bundlers.
 */
const json5Plugin = () => ({
  name: 'yakshetra-json5',
  transform(code: string, id: string): { code: string; map: null } | null {
    if (!id.endsWith('.json5')) {
      return null;
    }
    const parsed = JSON5.parse(code);
    return { code: `export default ${JSON.stringify(parsed)};`, map: null };
  },
});

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(here, 'src'),
    },
  },
  plugins: [json5Plugin()],
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
