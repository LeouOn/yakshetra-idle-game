// Vitest config for the report generator in `scripts/`.
//
// Separate from the main config on purpose. The main config's `include` is
// `src/**/*.test.{ts,tsx}` so that a generator — which WRITES a tracked
// document — can never be picked up by `pnpm test` and rewrite a file as a side
// effect of an ordinary suite run. The generator is also inert unless
// YAKSHETRA_WRITE_REPORT=1, so the two guards are deliberately redundant.
//
// Run:  YAKSHETRA_WRITE_REPORT=1 \
//       env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER \
//       pnpm exec vitest run --config scripts/report.vitest.config.ts

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { json5Plugin } from '../vitest-json5-plugin';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  plugins: [json5Plugin()],
  test: {
    include: ['scripts/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    root,
  },
});
