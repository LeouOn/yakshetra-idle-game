// Harness-local vitest config for the evaluation sims (lane b1).
// Mirrors the root config's alias + JSON5 plugin so the harness can import
// the real engine (`@/engine`) and content loaders unchanged. Scoped to this
// directory so `pnpm test` in the repo root never picks these up.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import JSON5 from 'json5';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

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
  root: here,
  resolve: {
    alias: {
      '@': resolve(repoRoot, 'src'),
    },
  },
  plugins: [json5Plugin()],
  test: {
    include: ['sim.test.ts'],
    environment: 'node',
    globals: false,
    setupFiles: [resolve(repoRoot, 'src/test/setup.ts')],
    reporters: ['default'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    server: {
      deps: { inline: [/.+/] },
    },
  },
});
